import type { Page } from "@playwright/test";
import { expect, expectNoErrors, expectNoStatusPage, test } from "./fixtures/app";
import { readAccess, readState, type HubAccess } from "./fixtures/hub";
import { approveDeviceCode } from "./fixtures/lok";

/** The modules the hub serves: their rail label (lok's is "Team") and route. */
const MODULES = [
  { label: "Mikro", path: "mikro" },
  { label: "Rekuest", path: "rekuest" },
  { label: "Fluss", path: "fluss" },
  { label: "Kabinet", path: "kabinet" },
  { label: "Kraph", path: "kraph" },
  { label: "Team", path: "lok" },
];

/** Pages one level down, each listing what its service holds: where most queries run. */
const PAGES: (string | { path: string; lands: RegExp })[] = [
  "mikro/arraydatasets",
  "mikro/scenes",
  "mikro/files",
  "rekuest/actions",
  "rekuest/agents",
  "rekuest/automations",
  "rekuest/tasks",
  "fluss/workspaces",
  "fluss/runs",
  "kabinet/app-store",
  "kabinet/apps",
  "kraph/graphs",
  // "Me" is the signed-in user's member page.
  { path: "lok/me", lands: /#\/lok\/members\/\w+$/ },
  "lok/mandates",
];

const hubAccess = (): HubAccess => {
  const state = readState();
  if (!state) throw new Error("No hub: run the `hub` project, which sets one up first (hub.setup.ts).");
  return readAccess(state.dir);
};

/**
 * Sign in the way a new user does: "More Options" → a custom server → its
 * address → Connect. The app starts a device-code grant and opens the hub's
 * approval page (recorded instead, `fixtures/app.ts`); the user approves it
 * there — here through lok's API, with the code the app was handed.
 */
const signIn = async (window: Page, access: HubAccess) => {
  await expect(window.getByTestId("welcome-layout")).toBeVisible({ timeout: 30_000 });
  await window.getByRole("button", { name: /more options/i }).click();
  await window.getByText(/connect to custom coordination server/i).click();
  await window.locator('input[name="url"]').fill(access.fakts_url);

  // The endpoint the hub advertises for an app's sign-in (`device_authorization_endpoint`).
  const wellKnown = (await (await fetch(new URL("/.well-known/fakts", access.fakts_url))).json()) as {
    device_authorization_endpoint: string;
  };
  const granted = window.waitForResponse(
    (response) => response.request().method() === "POST" && response.url() === wellKnown.device_authorization_endpoint,
  );
  await window.getByRole("button", { name: /^connect$/i }).click();
  const answered = await granted;
  const grant = (await answered.json()) as { user_code?: string };
  expect(answered.status(), JSON.stringify(grant)).toBe(200);
  expect(grant.user_code, "the hub answered the sign-in with a code to approve").toBeTruthy();

  const user = access.users[0];
  await approveDeviceCode({
    gatewayUrl: access.gateway_url,
    username: user.username,
    password: user.password,
    userCode: grant.user_code!,
    hub: access.hub,
  });
};

/** The rail's Home link (the breadcrumb has a "Home" link too). */
const railHome = (window: Page) => window.locator('a[aria-label="Home"]');

/** The signed-in shell: the rail's Home link, and Home's own sections. */
const expectSignedIn = async (window: Page) => {
  await expect(window.getByTestId("welcome-layout")).toHaveCount(0, { timeout: 60_000 });
  await expect(railHome(window)).toBeVisible({ timeout: 60_000 });
};

test.describe.configure({ mode: "serial" });

test("signs in, walks every module, and is still signed in after a restart", async ({ app }) => {
  const access = hubAccess();
  await signIn(app.window, access);
  await expectSignedIn(app.window);
  await expect(app.window.getByRole("heading", { name: /start somewhere/i })).toBeVisible();
  await expectNoStatusPage(app.window);

  for (const module of MODULES) {
    await test.step(`opens ${module.label} from the rail`, async () => {
      await app.window.getByRole("link", { name: module.label, exact: true }).first().click();
      await expect(app.window).toHaveURL(new RegExp(`#/${module.path}(/|$)`));
      // The module's page drew something of its own, and no fallback said the
      // service is missing, unreachable, or the route unknown.
      await expect(app.window.getByRole("heading").first()).toBeVisible();
      await expectNoStatusPage(app.window);
    });
  }

  for (const page of PAGES) {
    const { path, lands } = typeof page === "string" ? { path: page, lands: new RegExp(`#/${page}$`) } : page;
    await test.step(`opens ${path}`, async () => {
      // A hash change navigates the active tab (`core/tabs/hashMirror.ts`).
      await app.window.evaluate((target) => (window.location.hash = `#/${target}`), path);
      await expect(app.window).toHaveURL(lands);
      await expect(app.window.getByRole("heading").first()).toBeVisible();
      await expectNoStatusPage(app.window);
      // Lists settle: nothing still loading after its queries answered.
      await expect(app.window.getByRole("status").filter({ hasText: /loading/i })).toHaveCount(0);
    });
  }

  await test.step("back home", async () => {
    await railHome(app.window).click();
    await expect(app.window.getByRole("heading", { name: /start somewhere/i })).toBeVisible();
  });

  await test.step("relaunched, the account is still there", async () => {
    await app.relaunch();
    await expectSignedIn(app.window);
    await expectNoStatusPage(app.window);
  });

  expectNoErrors(app.errors);
});
