import { expect, expectNoErrors, test } from "./fixtures/app";

// The built app, freshly installed: no account yet. It must get past boot and
// show the welcome screen; a blank window here is what users saw.
test("boots to the welcome screen", async ({ app }) => {
  const { window } = app;
  await expect(window.getByTestId("welcome-layout")).toBeVisible({ timeout: 30_000 });
  await expect(window.getByRole("heading", { name: /let's get you started/i })).toBeVisible();
  await expect(window.getByRole("button", { name: /more options/i })).toBeVisible();
  expectNoErrors(app.errors);
});

test("opens the custom server sheet", async ({ app }) => {
  const { window } = app;
  await window.getByRole("button", { name: /more options/i }).click();
  await window.getByText(/connect to custom coordination server/i).click();
  await expect(window.locator('input[name="url"]')).toBeVisible();
  expectNoErrors(app.errors);
});
