import { defineConfig, devices } from "@playwright/test";
import { existsSync } from "node:fs";

for (const file of [".env.local", ".env.e2e.local"]) { if (existsSync(file)) process.loadEnvFile(file); }

export default defineConfig({
  testDir: "./tests/e2e", fullyParallel: false, workers: 1, timeout: 45000, retries: 0,
  use: { baseURL: process.env.TEST_BASE_URL ?? "http://127.0.0.1:3000", trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  reporter: "list",
});
