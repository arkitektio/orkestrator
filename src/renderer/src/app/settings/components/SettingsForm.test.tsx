// @vitest-environment jsdom
import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useFormContext } from "react-hook-form";

import { resetRendererBudgetForTests } from "@/core/settings/renderer/rendererBudget";
import { SettingsContext } from "@/core/settings/store/SettingsContext";
import { createSettingsStore, type SettingsStore } from "@/core/settings/store/settingsStore";
import type { Settings } from "@/core/settings/store/validator";

import { SettingsForm } from "./SettingsForm";

/**
 * The form holds the WHOLE settings object, so it has to follow the store:
 * settings also change behind an open page (the hardware probe landing, the
 * scene's debug panel), and a form still holding its mount-time values would
 * write them back over that change on its next edit.
 */

const RTX = {
  probedAt: "2026-10-07T10:00:00.000Z",
  totalRamMB: 31410,
  gpus: [{ vendor: "NVIDIA Corporation", model: "RTX 4070", vramMB: 12282, vramDynamic: false }],
};

/** One field of the form, plus a readout of another the page does not edit. */
const Probe = () => {
  const { watch, setValue } = useFormContext<Settings>();
  return (
    <>
      <output data-testid="gpu">{watch("rendererHardware")?.gpus[0]?.model ?? "none"}</output>
      <button type="button" onClick={() => setValue("showHoverCards", false)}>
        hover off
      </button>
    </>
  );
};

let store: SettingsStore;
const renderForm = () =>
  render(
    <SettingsContext.Provider value={store}>
      <SettingsForm>
        <Probe />
      </SettingsForm>
    </SettingsContext.Provider>,
  );

beforeEach(() => {
  localStorage.clear();
  resetRendererBudgetForTests();
  store = createSettingsStore();
  store.getState().hydrate();
});

describe("SettingsForm", () => {
  it("does not save anything just by being opened", async () => {
    const setSettings = vi.spyOn(store.getState(), "setSettings");
    renderForm();
    await act(async () => {});
    expect(setSettings).not.toHaveBeenCalled();
  });

  it("shows a change made behind it", async () => {
    renderForm();
    act(() => store.getState().setSettings({ ...store.getState().settings!, rendererHardware: RTX }));
    await waitFor(() => expect(screen.getByTestId("gpu").textContent).toBe("RTX 4070"));
  });

  it("keeps that change when the page is edited afterwards", async () => {
    renderForm();
    act(() => store.getState().setSettings({ ...store.getState().settings!, rendererHardware: RTX }));
    await waitFor(() => expect(screen.getByTestId("gpu").textContent).toBe("RTX 4070"));

    act(() => screen.getByText("hover off").click());
    await waitFor(() => expect(store.getState().settings?.showHoverCards).toBe(false));
    expect(store.getState().settings?.rendererHardware?.gpus[0].model).toBe("RTX 4070");
  });
});
