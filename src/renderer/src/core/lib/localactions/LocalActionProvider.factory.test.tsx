// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { createLocalActionProvider } from "./LocalActionProvider";

/**
 * A factory-built provider must actually mount.
 *
 * `createLocalActionProvider` is a FACTORY: the component it returns is defined
 * inside the factory's closure and calls `createLocalActionStore`, a local of
 * that same closure. So is `createDialogProvider`, so is every
 * `buildServiceGuard`, so is every scene store built by
 * `createScopedStoreHooks` — this shape is a convention of the codebase, not a
 * one-off.
 *
 * It is also a shape a build step can quietly break. Enabling React Compiler
 * outlined the `useState(() => createLocalActionStore())` initialiser to module
 * scope, where the factory-local binding does not exist, and the app died on
 * boot with `ReferenceError: createLocalActionStore is not defined` — while the
 * whole 4,600-test suite stayed green, because nothing rendered this provider.
 * That gap is what this file closes.
 */
describe("createLocalActionProvider", () => {
  it("mounts the provider it builds, closure bindings and all", () => {
    const { LocalActionProvider } = createLocalActionProvider({});

    expect(() =>
      render(
        <LocalActionProvider>
          <span data-testid="child">child</span>
        </LocalActionProvider>,
      ),
    ).not.toThrow();
  });

  it("renders its children", () => {
    const { LocalActionProvider } = createLocalActionProvider({});
    const { getByTestId } = render(
      <LocalActionProvider>
        <span data-testid="child">child</span>
      </LocalActionProvider>,
    );

    expect(getByTestId("child").textContent).toBe("child");
  });
});
