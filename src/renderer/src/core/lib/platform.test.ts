// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";

import { dragZoneDoubleClick, getChromeMode, getPlatform, isElectron, trafficLightGutter } from "./platform";

const setElectron = (platform?: string) => {
  if (platform === undefined) {
    // @ts-expect-error - deleting the injected global is the point
    delete window.electron;
    return;
  }
  // @ts-expect-error - stand in for @electron-toolkit's preload injection
  window.electron = { process: { platform } };
};

afterEach(() => {
  setElectron(undefined);
  vi.restoreAllMocks();
});

describe("platform detection", () => {
  it("reports web when the preload never ran", () => {
    setElectron(undefined);
    expect(isElectron()).toBe(false);
    expect(getPlatform()).toBe("web");
  });

  it("reports the real platform inside Electron", () => {
    setElectron("darwin");
    expect(isElectron()).toBe(true);
    expect(getPlatform()).toBe("darwin");
  });

  it("falls back to our own buttons on an unknown Electron platform", () => {
    // It is definitely frameless — CHROME_OPTIONS made it so — and it
    // definitely has no traffic lights.
    setElectron("freebsd");
    expect(getPlatform()).toBe("linux");
    expect(getChromeMode()).toBe("buttons");
  });
});

describe("getChromeMode", () => {
  it("draws no chrome in a browser tab", () => {
    setElectron(undefined);
    expect(getChromeMode()).toBe("none");
  });

  it("reserves a traffic-light gutter on macOS and draws no buttons", () => {
    setElectron("darwin");
    expect(getChromeMode()).toBe("mac");
  });

  it("gives Windows the auto-hiding bar, not the Controls Overlay", () => {
    // WCO's buttons are the OS's and cannot be collapsed to nothing
    // (`setTitleBarOverlay({height: 0})` clamps to 30px), which is what kept a
    // permanent strip across the top of the window.
    setElectron("win32");
    expect(getChromeMode()).toBe("autohide");
  });

  it("draws its own buttons on Linux, which is frameless", () => {
    setElectron("linux");
    expect(getChromeMode()).toBe("buttons");
  });
});

describe("trafficLightGutter", () => {
  it("reserves room only for real traffic lights", () => {
    expect(trafficLightGutter("mac", false)).toBeGreaterThan(0);
    expect(trafficLightGutter("autohide", false)).toBe(0);
    expect(trafficLightGutter("buttons", false)).toBe(0);
    expect(trafficLightGutter("none", false)).toBe(0);
  });

  it("collapses in fullscreen, where macOS removes the lights", () => {
    // Otherwise the centred search bar sits permanently off-centre.
    expect(trafficLightGutter("mac", true)).toBe(0);
  });
});

describe("dragZoneDoubleClick", () => {
  const withBridge = () => {
    const toggleMaximize = vi.fn();
    // @ts-expect-error - stand in for the preload injection
    window.api = { windowControls: { toggleMaximize } };
    return toggleMaximize;
  };
  afterEach(() => {
    // @ts-expect-error - clean up the injected global
    delete window.api;
  });

  it("only exists where the frame is ours to replace (Linux)", () => {
    // macOS and Windows keep a real frame that already handles the bar.
    expect(dragZoneDoubleClick("mac")).toBeUndefined();
    expect(dragZoneDoubleClick("autohide")).toBeUndefined();
    expect(dragZoneDoubleClick("none")).toBeUndefined();
    expect(dragZoneDoubleClick("buttons")).toBeTypeOf("function");
  });

  it("toggles maximise from the bar itself", () => {
    const toggleMaximize = withBridge();
    const zone = document.createElement("div");
    dragZoneDoubleClick("buttons")!({ target: zone });
    expect(toggleMaximize).toHaveBeenCalledTimes(1);
  });

  it("leaves a double-click on a control to the control", () => {
    // A double-clicked search pill or nav button must not fling the window
    // into maximise as a side effect.
    const toggleMaximize = withBridge();
    const zone = document.createElement("div");
    const control = document.createElement("button");
    control.className = "app-no-drag";
    zone.appendChild(control);
    dragZoneDoubleClick("buttons")!({ target: control });
    expect(toggleMaximize).not.toHaveBeenCalled();
  });

  it("is inert without the bridge", () => {
    expect(() => dragZoneDoubleClick("buttons")!({ target: null })).not.toThrow();
  });
});
