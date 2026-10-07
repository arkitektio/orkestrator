// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  getReportableHardware,
  getRendererBudget,
  resetRendererBudgetForTests,
  writeRendererSettings,
} from "../renderer/rendererBudget";
import { createSettingsStore } from "./settingsStore";
import { defaultSettings } from "./validator";

/**
 * The renderer budget as a setting: the store applies it to the one
 * synchronous source the scene reads, takes writes from outside React, and
 * adopts the two `localStorage` keys the scene's debug panel used to own.
 */

const MiB = 1024 * 1024;
const SETTINGS_KEY = "wasser-settings";
const RTX = {
  probedAt: "2026-10-07T10:00:00.000Z",
  totalRamMB: 31410,
  gpus: [{ vendor: "NVIDIA Corporation", model: "RTX 4070", vramMB: 12282, vramDynamic: false }],
  adapterVendor: "nvidia",
};

const stored = () => JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? "{}");

beforeEach(() => {
  localStorage.clear();
  resetRendererBudgetForTests();
});
afterEach(() => resetRendererBudgetForTests());

describe("renderer settings", () => {
  it("start automatic, with nothing detected", () => {
    const store = createSettingsStore();
    store.getState().hydrate();
    const { settings } = store.getState();
    expect(settings?.rendererHardware).toBeNull();
    expect(settings?.rendererGpuBudgetMB).toBeNull();
    expect(getRendererBudget().gpuSource.kind).toBe("legacy");
  });

  it("accept settings stored before these fields existed", () => {
    const {
      rendererHardware,
      rendererGpuBudgetMB,
      rendererDecodeCacheMB,
      telemetryDetectHardware,
      telemetryAttachHardware,
      ...old
    } = defaultSettings;
    void rendererHardware, rendererGpuBudgetMB, rendererDecodeCacheMB;
    void telemetryDetectHardware, telemetryAttachHardware;
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...old, showHoverCards: false }));
    const store = createSettingsStore();
    store.getState().hydrate();
    expect(store.getState().settings?.showHoverCards).toBe(false);
    expect(store.getState().settings?.rendererHardware).toBeNull();
  });

  it("derive the ceiling from the detected card as soon as it is saved", () => {
    const store = createSettingsStore();
    store.getState().hydrate();
    store.getState().setSettings({ ...store.getState().settings!, rendererHardware: RTX });
    expect(getRendererBudget().gpuBudgetBytes).toBe(6141 * MiB);
    expect(stored().rendererHardware.gpus[0].vramMB).toBe(12282);
  });

  it("resolve the same ceiling before the store hydrates as after", () => {
    localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({ ...defaultSettings, rendererHardware: RTX, rendererGpuBudgetMB: 3000 }),
    );
    // A scene module reading the budget while it is imported.
    expect(getRendererBudget().gpuBudgetBytes).toBe(3000 * MiB);
    const store = createSettingsStore();
    store.getState().hydrate();
    expect(getRendererBudget().gpuBudgetBytes).toBe(3000 * MiB);
  });

  it("take a write from outside React and keep it", () => {
    const store = createSettingsStore();
    store.getState().hydrate();
    writeRendererSettings({ rendererGpuBudgetMB: 2048 });
    expect(store.getState().settings?.rendererGpuBudgetMB).toBe(2048);
    expect(stored().rendererGpuBudgetMB).toBe(2048);
    expect(getRendererBudget().gpuSource.kind).toBe("custom");

    writeRendererSettings({ rendererGpuBudgetMB: null });
    expect(getRendererBudget().gpuSource.kind).toBe("legacy");
  });

  it("adopt the debug panel's old override keys once, then drop them", () => {
    localStorage.setItem("orkestrator.volumeBudgetMB", "1536");
    localStorage.setItem("orkestrator.decodeCacheMB", "auto");
    const store = createSettingsStore();
    store.getState().hydrate();
    expect(store.getState().settings?.rendererGpuBudgetMB).toBe(1536);
    expect(store.getState().settings?.rendererDecodeCacheMB).toBeNull();
    expect(localStorage.getItem("orkestrator.volumeBudgetMB")).toBeNull();
    expect(localStorage.getItem("orkestrator.decodeCacheMB")).toBeNull();
    expect(getRendererBudget().gpuBudgetBytes).toBe(1536 * MiB);
  });

  it("do not let an old key overrule a setting the user already made", () => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...defaultSettings, rendererGpuBudgetMB: 4096 }));
    localStorage.setItem("orkestrator.volumeBudgetMB", "512");
    const store = createSettingsStore();
    store.getState().hydrate();
    expect(store.getState().settings?.rendererGpuBudgetMB).toBe(4096);
    expect(localStorage.getItem("orkestrator.volumeBudgetMB")).toBeNull();
  });
});

describe("telemetry opt-outs", () => {
  it("are both on until switched off", () => {
    const store = createSettingsStore();
    store.getState().hydrate();
    expect(store.getState().settings?.telemetryDetectHardware).toBe(true);
    expect(store.getState().settings?.telemetryAttachHardware).toBe(true);
  });

  it("offer the snapshot to bug reports only while attaching is on", () => {
    const store = createSettingsStore();
    store.getState().hydrate();
    store.getState().setSettings({ ...store.getState().settings!, rendererHardware: RTX });
    expect(getReportableHardware()?.gpus[0].model).toBe("RTX 4070");

    store.getState().setSettings({ ...store.getState().settings!, telemetryAttachHardware: false });
    expect(getReportableHardware()).toBeNull();
    // Only the report changes: the ceiling still comes from the card.
    expect(getRendererBudget().gpuBudgetBytes).toBe(6141 * MiB);
  });

  it("forget what was detected when detection is switched off", () => {
    const store = createSettingsStore();
    store.getState().hydrate();
    store.getState().setSettings({ ...store.getState().settings!, rendererHardware: RTX });
    store.getState().setSettings({ ...store.getState().settings!, telemetryDetectHardware: false });

    expect(store.getState().settings?.rendererHardware).toBeNull();
    expect(stored().rendererHardware).toBeNull();
    expect(getReportableHardware()).toBeNull();
    expect(getRendererBudget().gpuSource.kind).toBe("legacy");
  });

  it("refuse a snapshot written while detection is off", () => {
    const store = createSettingsStore();
    store.getState().hydrate();
    store.getState().setSettings({ ...store.getState().settings!, telemetryDetectHardware: false });
    // A probe that was already under way when the user opted out.
    store.getState().setSettings({ ...store.getState().settings!, rendererHardware: RTX });
    expect(store.getState().settings?.rendererHardware).toBeNull();
  });

  it("respect a stored opt-out before the store hydrates", () => {
    localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({ ...defaultSettings, rendererHardware: RTX, telemetryAttachHardware: false }),
    );
    expect(getReportableHardware()).toBeNull();
  });
});
