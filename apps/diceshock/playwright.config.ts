import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.DICESHOCK_E2E_PORT ?? "5173");
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${port}`;
const skipWebServer = process.env.PLAYWRIGHT_SKIP_WEBSERVER === "1";

export default defineConfig({
  testDir: "./e2e/fullstack",
  outputDir: "./e2e/artifacts/test-results",
  reporter: [["list"], ["html", { outputFolder: "./e2e/artifacts/html-report", open: "never" }]],
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile-chrome",
      use: { ...devices["Pixel 7"] },
    },
  ],
  ...(skipWebServer
    ? {}
    : {
        webServer: {
          command: `pnpm exec vite --host 127.0.0.1 --port ${port}`,
          url: baseURL,
          reuseExistingServer: true,
          timeout: 180_000,
          stdout: "pipe",
          stderr: "pipe",
          env: { SSL_CERT_FILE: "/etc/ssl/certs/ca-certificates.crt" },
        },
      }),
});
