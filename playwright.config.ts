import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e", fullyParallel: false, timeout: 30000, retries: 0,
  use: { baseURL: process.env.TEST_BASE_URL ?? "http://127.0.0.1:3000", trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  reporter: "list",
});
