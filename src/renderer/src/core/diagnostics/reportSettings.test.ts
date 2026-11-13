import { describe, expect, it } from "vitest";
import { defaultSettings } from "@/core/settings/store/validator";
import { describeSelection, selectionFromSettings } from "./reportSettings";

describe("what a report carries by default", () => {
  it("follows Settings → Telemetry, and leaves the page's data out until asked", () => {
    expect(selectionFromSettings(defaultSettings)).toMatchObject({ screenshot: true, errors: true, data: false });
    const selection = selectionFromSettings({
      ...defaultSettings,
      telemetryReportScreenshot: false,
      telemetryReportData: true,
    });
    expect(selection.screenshot).toBe(false);
    expect(selection.data).toBe(true);
  });

  it("names only the parts that are both switched on and there", () => {
    const selection = selectionFromSettings({ ...defaultSettings, telemetryReportConsole: false });
    expect(describeSelection(selection, { screenshot: true, errors: true, console: true, steps: true })).toBe(
      "a screenshot, recent errors and the steps before this",
    );
    expect(describeSelection(selection, { errors: true })).toBe("recent errors");
    expect(describeSelection(selection, {})).toBe("");
  });
});
