import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
export const E2E_DB = process.env.E2E_DATABASE_URL ?? "postgresql://maronga@localhost:5433/maronga_e2e";

// Everything the app server (and the seed) need, pinned for deterministic runs.
export const E2E_ENV: Record<string, string> = {
  DATABASE_URL: E2E_DB,
  APP_URL: `http://localhost:${PORT}`,
  AUTH_SECRET: "e2e-secret-e2e-secret-e2e-secret-1234",
  EMAIL_PROVIDER: "console",
  STORAGE_PROVIDER: "local",
  STORAGE_LOCAL_DIR: ".storage-e2e",
  RATE_LIMIT_PROVIDER: "db",
  PAYMENTS_MODE: "simulated",
  FEATURE_DISCUSSIONS: "true",
  NODE_ENV: "production",
};

export default defineConfig({
  testDir: "tests/e2e",
  testMatch: /.*\.spec\.ts/,
  fullyParallel: false,
  workers: 1, // one shared database
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  // Branded Chrome (not bundled Chromium) so the H.264 placeholder videos can actually play.
  projects: [{ name: "chrome", use: { ...devices["Desktop Chrome"], channel: "chrome" } }],
  webServer: {
    // Production server against the built app (run `npm run build` first; CI does).
    // Migrate + seed the dedicated E2E database first (the server needs it before it can answer).
    command: `npm run e2e:prepare && npm run start -- -p ${PORT}`,
    url: `http://localhost:${PORT}/login`,
    // Never reuse: a stale server means a stale build and an un-reseeded database.
    reuseExistingServer: false,
    timeout: 120_000,
    env: E2E_ENV,
  },
});
