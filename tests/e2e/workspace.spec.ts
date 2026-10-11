import { test, expect, type Page } from "@playwright/test";
import { catalog } from "../../lib/catalog";
import { signInTestAccount } from "./helpers";

test.beforeEach(async ({ context }) => { await signInTestAccount(context, { reset: true }); });

async function stubSearch(page: Page) {
  await page.route("**/api/search?**", async route => {
    const url = new URL(route.request().url());
    const web = url.searchParams.get("mode") === "web";
    await route.fulfill({ json: { grants: web ? [] : catalog, total: web ? 0 : catalog.length,
      federalAvailable: false, webAvailable: false, hasMore: false, warnings: [], searchedAt: new Date().toISOString() } });
  });
}
async function onboard(page: Page) {
  await page.goto("/");
  await page.getByLabel("School or district name").fill("Riverside Test School");
  await page.getByLabel("City", { exact: true }).fill("Boise");
  await page.getByLabel("Elementary", { exact: false }).check();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByLabel("STEM & technology", { exact: true }).check();
  await page.getByLabel("Students served").fill("350");
  await page.getByLabel("Project funding goal (USD)").fill("25000");
  await page.getByRole("button", { name: "Find my school’s grants" }).click();
  await expect(page.getByRole("heading", { name: "Funding for what comes next." })).toBeVisible();
  await expect(page.locator(".grant-card")).toHaveCount(6);
  await expect(page.getByRole("status").filter({ hasText: "Saved to cloud" })).toBeVisible();
}

test("school setup, match details, saving, stages, notes, and reload persistence", async ({ page }) => {
  await stubSearch(page); await onboard(page);
  await page.getByRole("button", { name: "STEM classroom grants · Grades K–5", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByText("Your school’s match", { exact: true })).toBeVisible();
  await expect(page.getByText("Funding priorities", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Save grant", exact: true }).click();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Saved grants", exact: false }).first().click();
  await page.getByLabel("Application stage").selectOption("drafting");
  await page.getByLabel("Your notes").fill("Ask the principal to review the project budget.");
  await expect(page.getByRole("status").filter({ hasText: "Saved to cloud" })).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Saved grants", exact: false }).first().click();
  await expect(page.getByLabel("Application stage")).toHaveValue("drafting");
  await expect(page.getByLabel("Your notes")).toHaveValue("Ask the principal to review the project budget.");
  const [csv] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Export CSV" }).click()]);
  expect(csv.suggestedFilename()).toBe("grantradar-saved-grants.csv");
  await page.getByRole("button", { name: "Your school", exact: true }).click();
  const [backup] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Export backup" }).click()]);
  expect(backup.suggestedFilename()).toBe("grantradar-backup.json");
});

test("filters explain empty results and web search offers a real external link", async ({ page }) => {
  await stubSearch(page); await onboard(page);
  await page.getByLabel("Minimum match score").selectOption("80");
  await expect(page.getByText("No opportunities match this view.")).toBeVisible();
  await page.getByRole("button", { name: "Clear filters", exact: true }).click();
  await expect(page.locator(".grant-card")).toHaveCount(6);
  await page.getByRole("button", { name: "Web search", exact: true }).click();
  await expect(page.getByRole("link", { name: "Open web search", exact: true })).toHaveAttribute("href", /google\.com\/search\?q=.*Boise/);
  await expect(page.getByText("Continue your search on the web.")).toBeVisible();
});

test("mobile layout fits the screen and a grant dialog closes with Escape", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await stubSearch(page); await onboard(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(await page.locator(".source-tabs").evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
  await page.getByRole("button", { name: "STEM classroom grants · Grades K–5", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "Your school", exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("invalid backups leave the school workspace intact", async ({ page }) => {
  await stubSearch(page); await onboard(page);
  await page.getByRole("button", { name: "Your school", exact: true }).click();
  await page.getByLabel("Restore a GrantRadar backup").setInputFiles({ name: "invalid.json", mimeType: "application/json", buffer: Buffer.from('{"version":1}') });
  await expect(page.locator(".toast")).toContainText("not a valid GrantRadar backup");
  await expect(page.getByRole("heading", { name: "Riverside Test School", exact: true })).toBeVisible();
});

test("a separate account cannot see another school's profile", async ({ page, browser }) => {
  await stubSearch(page); await onboard(page);
  const context = await browser.newContext();
  await signInTestAccount(context, { second: true, reset: true });
  const otherPage = await context.newPage();
  await otherPage.goto("/");
  await expect(otherPage.getByLabel("School or district name")).toHaveValue("");
  await context.close();
});

test("a school can score and track a grant found through external search", async ({ page }) => {
  await stubSearch(page); await onboard(page);
  await page.getByRole("button", { name: "Web search", exact: true }).click();
  await page.getByRole("button", { name: "Add a grant link", exact: true }).click();
  await page.getByLabel("Grant title", { exact: true }).fill("Local STEM classroom grant");
  await page.getByLabel("Source website", { exact: true }).fill("http://foundation.example/grants");
  await page.getByRole("button", { name: "Save grant link", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText("secure website");
  await page.getByLabel("Source website", { exact: true }).fill("https://foundation.example/grants");
  await page.getByLabel("What the grant funds", { exact: false }).fill("Science equipment and STEM projects for elementary schools.");
  await page.getByRole("button", { name: "Save grant link", exact: true }).click();
  await expect(page.getByRole("button", { name: "Local STEM classroom grant", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Local STEM classroom grant", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("Verify current cycle");
  await expect(page.getByRole("dialog")).toContainText("Your school’s match");
  await expect(page.getByRole("dialog")).toContainText("Added by your school");
  await expect(page.locator(".cloud-status")).toHaveText("Saved to cloud");
});
