import { defineConfig } from "playwright/test";

export default defineConfig({
  testDir: "e2e",
  timeout: 60 * 1000,
  retries: process.env.CI ? 1 : 0,
  fullyParallel: true,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    headless: true,
    viewport: { width: 1280, height: 720 },
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev -- --hostname localhost --port 3000",
    port: 3000,
    reuseExistingServer: !process.env.CI,
    env: {
      PORTAL_DEV_SESSION_BYPASS: "true",
      NEXT_PUBLIC_PORTAL_DEV_AUTH_BYPASS: "1",
      NEXT_PUBLIC_DEV_AUTH_BYPASS: "true",
      NEXT_PUBLIC_API_BASE_URL: "https://api.nulanesystems.com/api",
    },
  },
});
