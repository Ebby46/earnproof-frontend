import { defineConfig, devices } from "@playwright/test";

const PORT = process.env.PLAYWRIGHT_PORT ?? "3100";
const BASE_URL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./e2e/accessibility",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 1,
  // A single Next.js server backs every worker; running specs one at a
  // time keeps focus/timing-sensitive keyboard assertions deterministic
  // instead of racing multiple browser contexts against one dev server.
  workers: 1,
  reporter: process.env.CI
    ? [["html", { outputFolder: "playwright-report", open: "never" }], ["list"]]
    : "list",
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "Desktop Chrome",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } },
    },
    {
      name: "Mobile Chrome",
      use: { ...devices["Pixel 5"] },
    },
  ],
  webServer: {
    command: `npx next build && npx next start -p ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    stdout: "pipe",
    stderr: "pipe",
    env: {
      NEXT_PUBLIC_APP_URL: BASE_URL,
      NEXT_PUBLIC_API_URL: "http://127.0.0.1:4000/api/v1",
      NEXT_PUBLIC_STELLAR_NETWORK: "testnet",
      NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE: "Test SDF Network ; September 2015",
    },
/**
 * The API base is intentionally unreachable (a synthetic loopback port with
 * no server behind it). Every spec installs `apiMock` before navigating, so
 * every request to this origin is answered by Playwright's route
 * interception rather than a live network call — this constant only needs
 * to be a stable, unique origin for the fixtures to key off.
 */
const MOCK_API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:4010/api/v1";

export default defineConfig({
  testDir: "./e2e",
  // The visual regression suite lives under e2e/visual but has its own
  // dedicated config (playwright.visual.config.ts) with different project
  // names/viewports and baseline snapshots — exclude it here so it isn't
  // also picked up (and run under the wrong projects) by this config.
  testIgnore: "**/visual/**",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [["html", { open: "never" }], ["list"]] : "list",
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
    actionTimeout: 15_000,
  },
  projects: [
    {
      name: "desktop-chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile-chromium",
      use: { ...devices["Pixel 5"] },
    },
  ],
  webServer: {
    // A production build + `next start` is used instead of `next dev` so
    // Fast Refresh / on-demand Turbopack compilation never interrupts a
    // spec mid-interaction (dev-mode HMR can remount client components
    // while a test is mid-click, producing flaky "session vanished"
    // failures that have nothing to do with the app or the test).
    command: `npm run build && npm run start -- -p ${PORT} -H 127.0.0.1`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      NEXT_PUBLIC_API_URL: MOCK_API_URL,
    },
  },
});
