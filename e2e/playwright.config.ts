import { defineConfig } from "@playwright/test";

/**
 * End-to-end tests of the BUILT app (`pnpm build` → `out/`), the same bundle
 * users run: `pnpm dev` serves unbundled modules and hides whatever only a
 * production bundle does (chunk loading order, minification).
 *
 * - `smoke`: the app boots to its first screen. No hub; runs in CI on every push.
 * - `hub`: a self-contained konstruktor hub is created (`hub.setup.ts`),
 *   the app connects, signs in, walks the modules and is relaunched.
 */
export default defineConfig({
  testDir: ".",
  outputDir: "../test-results/e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never", outputFolder: "../playwright-report" }]] : "list",
  timeout: 120_000,
  expect: { timeout: 20_000 },
  use: { trace: "retain-on-failure" },
  projects: [
    { name: "smoke", testMatch: /smoke\.spec\.ts/ },
    // Creates (or adopts, with E2E_HUB_DIR) a self-contained hub, and removes
    // the one it created once the `hub` tests are done.
    { name: "hub-setup", testMatch: /hub\.setup\.ts/, teardown: "hub-teardown", timeout: 900_000 },
    { name: "hub-teardown", testMatch: /hub\.teardown\.ts/, timeout: 300_000 },
    { name: "hub", testMatch: /hub\.spec\.ts/, dependencies: ["hub-setup"], timeout: 300_000 },
  ],
});
