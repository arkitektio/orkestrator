// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useWindowState } from "./platform";

/**
 * One window, one subscription.
 *
 * `useWindowState` used to be `useState` + an effect, so every caller opened
 * its own `getState()` round-trip and registered its own broadcast listener —
 * three of each, for one window, across `RailChrome`, `AutoHideTitleBar` and
 * `WelcomeLayout`. These tests pin the shared store that replaced it.
 */

let onStateChanged: (state: unknown) => void;
let dispose: ReturnType<typeof vi.fn>;

const bridge = () => {
  dispose = vi.fn();
  return {
    getState: vi.fn().mockResolvedValue({ maximized: true, fullscreen: false, focused: true }),
    onStateChanged: vi.fn((cb: (state: unknown) => void) => {
      onStateChanged = cb;
      return dispose;
    }),
  };
};

let controls: ReturnType<typeof bridge>;

const Probe = () => {
  const { maximized } = useWindowState();
  return <span data-testid="max">{String(maximized)}</span>;
};

beforeEach(() => {
  controls = bridge();
  (window as unknown as { api: unknown }).api = { windowControls: controls };
});

afterEach(() => {
  delete (window as unknown as { api?: unknown }).api;
});

describe("useWindowState", () => {
  it("opens one round-trip and one listener however many components ask", () => {
    render(
      <>
        <Probe />
        <Probe />
        <Probe />
      </>,
    );

    expect(controls.getState).toHaveBeenCalledTimes(1);
    expect(controls.onStateChanged).toHaveBeenCalledTimes(1);
  });

  it("gives every caller the same answer from one broadcast", async () => {
    const { findAllByTestId } = render(
      <>
        <Probe />
        <Probe />
      </>,
    );

    onStateChanged({ maximized: true, fullscreen: true, focused: true });

    const nodes = await findAllByTestId("max");
    expect(nodes.map((n) => n.textContent)).toEqual(["true", "true"]);
  });

  it("stops listening once the last caller unmounts", () => {
    const { unmount } = render(
      <>
        <Probe />
        <Probe />
      </>,
    );

    expect(dispose).not.toHaveBeenCalled();
    unmount();
    expect(dispose).toHaveBeenCalledTimes(1);
  });

  it("wires afresh on the next mount, against whatever bridge is there now", () => {
    unmountAll(render(<Probe />));
    const next = bridge();
    (window as unknown as { api: unknown }).api = { windowControls: next };

    unmountAll(render(<Probe />));
    expect(next.getState).toHaveBeenCalledTimes(1);
  });

  it("returns the inert default, and does not throw, with no bridge at all", () => {
    delete (window as unknown as { api?: unknown }).api;
    const { getByTestId } = render(<Probe />);
    expect(getByTestId("max").textContent).toBe("false");
  });
});

const unmountAll = ({ unmount }: { unmount: () => void }) => unmount();
