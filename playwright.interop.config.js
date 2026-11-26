import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/integration",
  workers: 1,
  timeout: 120_000,
  expect: { timeout: 60_000 },
  forbidOnly: true,
  reporter: "list",
  use: { ...devices["Desktop Chrome"], baseURL: "http://127.0.0.1:4174" },
  webServer: {
    command: "node scripts/serve.mjs --port 4174",
    url: "http://127.0.0.1:4174",
    reuseExistingServer: false,
  },
});
