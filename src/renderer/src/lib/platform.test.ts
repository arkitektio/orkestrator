// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";

import { getChromeMode, getPlatform, isElectron, trafficLightGutter } from "./platform";

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

  it("lets Windows keep its own overlay buttons", () => {
    // Deliberately NOT our own buttons: a frameless Windows window loses Snap
    // Layouts, and there is no way to fake the maximise-button hit test.
    setElectron("win32");
    expect(getChromeMode()).toBe("overlay");
  });

  it("draws its own buttons on Linux, which is frameless", () => {
    setElectron("linux");
    expect(getChromeMode()).toBe("buttons");
  });
});

describe("trafficLightGutter", () => {
  it("reserves room only for real traffic lights", () => {
    expect(trafficLightGutter("mac", false)).toBeGreaterThan(0);
    expect(trafficLightGutter("overlay", false)).toBe(0);
    expect(trafficLightGutter("buttons", false)).toBe(0);
    expect(trafficLightGutter("none", false)).toBe(0);
  });

  it("collapses in fullscreen, where macOS removes the lights", () => {
    // Otherwise the centred search bar sits permanently off-centre.
    expect(trafficLightGutter("mac", true)).toBe(0);
  });
});
