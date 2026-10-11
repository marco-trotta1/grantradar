import { test, expect, type BrowserContext, type Page } from "@playwright/test";
import { catalog } from "../../lib/catalog";
import { workspaceSchema } from "../../lib/domain";
import { signInTestAccount } from "./helpers";

const origin = process.env.TEST_BASE_URL ?? "http://127.0.0.1:3000";
const workspace = workspaceSchema.parse({ version: 1, profile: {
  name: "Cloud Test School", city: "Boise", state: "ID", schoolType: "public-school", grades: ["elementary"],
  students: 300, fundingGoal: 10000, priorities: ["STEM & technology"], locale: "rural", titleI: false, capacity: "limited", mission: "A science lab",
}, saved: [{ grant: catalog[0], stage: "researching", notes: "Initial school notes", savedAt: "2026-10-11T03:00:00Z" }] });

async function stubSearch(page: Page) {
  await page.route("**/api/search?**", route => route.fulfill({ json: { grants: catalog, total: catalog.length, federalAvailable: false, webAvailable: false, hasMore: false, warnings: [], searchedAt: new Date().toISOString() } }));
}
async function seed(context: BrowserContext) {
  const auth = await signInTestAccount(context, { reset: true });
  const response = await context.request.put(`${origin}/api/workspace`, { headers: { Origin: origin }, data: { workspace, revision: 0 } });
  expect(response.status()).toBe(200);
  return auth;
}
async function openSaved(page: Page) {
  await stubSearch(page); await page.goto("/");
  await page.getByRole("button", { name: "Saved grants", exact: false }).first().click();
  await expect(page.getByLabel("Your notes")).toBeVisible();
}
async function saved(page: Page) { await expect(page.locator(".cloud-status")).toHaveText("Saved to cloud"); }

test("signed-out requests cannot read or change cloud data", async ({ page, request }) => {
  expect((await request.get("/api/workspace")).status()).toBe(401);
  expect((await request.get("/api/workspace/history")).status()).toBe(401);
  expect((await request.put("/api/workspace", { headers: { Origin: origin }, data: { workspace, revision: 0 } })).status()).toBe(401);
  expect((await request.put("/api/workspace", { headers: { Origin: "https://another.example" }, data: { workspace, revision: 0 } })).status()).toBe(403);
  expect((await request.delete("/api/account", { headers: { Origin: origin } })).status()).toBe(401);
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByLabel("School email")).toBeVisible();
  await expect(page.locator(".brand-symbol")).toHaveAttribute("src", /logo\.png/);
  await page.goto("/help"); await expect(page.getByRole("heading", { name: "Use another device" })).toBeVisible();
});

test("the same account loads its grants and notes on another device", async ({ page, context, browser }) => {
  await seed(context); await openSaved(page);
  await page.getByLabel("Your notes").fill("Review the science budget with the principal."); await saved(page);
  const other = await browser.newContext(); await signInTestAccount(other);
  const second = await other.newPage(); await openSaved(second);
  await expect(second.getByLabel("Your notes")).toHaveValue("Review the science budget with the principal.");
  await second.getByLabel("Application stage").selectOption("drafting"); await saved(second);
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(page.getByLabel("Application stage")).toHaveValue("drafting");
  await other.close();
});

test("database policies isolate accounts even when a client requests another owner", async ({ context, browser }) => {
  const first = await seed(context);
  const other = await browser.newContext();
  const second = await signInTestAccount(other, { second: true, reset: true });
  const read = await second.supabase.from("school_workspaces").select("data").eq("user_id", first.userId);
  expect(read.error).toBeNull(); expect(read.data).toEqual([]);
  const update = await second.supabase.from("school_workspaces").update({ data: workspace, revision: 2 }).eq("user_id", first.userId).select();
  expect(update.error).toBeNull(); expect(update.data).toEqual([]);
  const history = await second.supabase.from("workspace_history").select("data").eq("user_id", first.userId);
  expect(history.error).toBeNull(); expect(history.data).toEqual([]);
  const response = await other.request.get(`${origin}/api/workspace`);
  expect(await response.json()).toEqual({ workspace: null, revision: 0, updatedAt: null });
  await other.close();
});

test("a stale device cannot silently replace a newer cloud save", async ({ page, context, browser }) => {
  await seed(context); await openSaved(page);
  const other = await browser.newContext(); await signInTestAccount(other);
  const second = await other.newPage(); await openSaved(second);
  let release = () => {};
  const gate = new Promise<void>(resolve => { release = resolve; });
  let held = false;
  await page.route("**/api/workspace", async route => {
    if (route.request().method() === "PUT") { held = true; await gate; }
    await route.continue();
  });
  await page.getByLabel("Your notes").fill("Changes from device one.");
  await expect.poll(() => held).toBe(true);
  await second.getByLabel("Your notes").fill("Changes from device two."); await saved(second);
  const rejected = page.waitForResponse(response => response.url().endsWith("/api/workspace") && response.request().method() === "PUT");
  release();
  expect((await rejected).status()).toBe(409);
  await expect(page.locator(".conflict-notice")).toContainText("another device");
  await expect(page.getByLabel("Your notes")).toHaveValue("Changes from device one.");
  const [backup] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Download device version" }).click()]);
  expect(backup.suggestedFilename()).toBe("grantradar-backup.json");
  page.once("dialog", dialog => dialog.accept());
  await page.getByRole("button", { name: "Use cloud version" }).click();
  await expect(page.getByLabel("Your notes")).toHaveValue("Changes from device two.");
  await saved(page); await other.close();
});

test("failed saves retain a recovery draft through reload and retry", async ({ page, context }) => {
  await seed(context); await openSaved(page);
  await page.route("**/api/workspace", route => route.request().method() === "PUT" ? route.abort("internetdisconnected") : route.continue());
  await page.getByLabel("Your notes").fill("Keep these notes while the connection fails.");
  await expect(page.locator(".notice.error")).toContainText("draft stays on this device");
  page.on("dialog", dialog => dialog.accept());
  await page.reload();
  await page.getByRole("button", { name: "Saved grants", exact: false }).first().click();
  await expect(page.getByLabel("Your notes")).toHaveValue("Keep these notes while the connection fails.");
  await expect(page.locator(".notice.error")).toContainText("draft stays on this device");
  await page.unroute("**/api/workspace");
  await page.getByRole("button", { name: "Retry cloud save" }).click(); await saved(page);
  const response = await context.request.get(`${origin}/api/workspace`);
  expect((await response.json()).workspace.saved[0].notes).toBe("Keep these notes while the connection fails.");
});

test("existing browser work moves into the account only after staff choose it", async ({ page, context }) => {
  await signInTestAccount(context, { reset: true });
  await page.addInitScript(value => localStorage.setItem("grantradar.school.v1", JSON.stringify(value)), workspace);
  await stubSearch(page); await page.goto("/");
  await expect(page.getByRole("button", { name: "Move workspace to my account" })).toBeVisible();
  const before = await context.request.get(`${origin}/api/workspace`);
  expect((await before.json()).workspace).toBeNull();
  await page.getByRole("button", { name: "Move workspace to my account" }).click(); await saved(page);
  await expect(page.getByRole("heading", { name: "Funding for what comes next." })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("grantradar.school.v1"))).toBeNull();
});

test("staff can restore a previous cloud save", async ({ page, context }) => {
  await seed(context); await openSaved(page);
  await page.getByLabel("Your notes").fill("A later version of the notes."); await saved(page);
  await page.getByRole("button", { name: "Your school", exact: true }).click();
  await page.getByRole("button", { name: "Previous cloud saves" }).click();
  await expect(page.locator(".history-row")).toHaveCount(1);
  page.once("dialog", dialog => dialog.accept());
  await page.getByRole("button", { name: "Restore", exact: true }).click(); await saved(page);
  await page.getByRole("button", { name: "Saved grants", exact: false }).first().click();
  await expect(page.getByLabel("Your notes")).toHaveValue("Initial school notes");
});

test("sign-out removes access and another account starts with its own workspace", async ({ page, context }) => {
  await seed(context); await openSaved(page);
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  expect((await context.request.get(`${origin}/api/workspace`)).status()).toBe(401);
  await signInTestAccount(context, { second: true, reset: true });
  await page.goto("/"); await expect(page.getByLabel("School or district name")).toHaveValue("");
});
