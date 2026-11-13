import type { Settings } from "@/core/settings/store/validator";
import type { ReportSelection } from "./report";

/**
 * What a bug report carries unless the user says otherwise in the dialog:
 * the switches under Settings → Telemetry. The plain report ("What's
 * wrong?") sends exactly this; "Debug yourself" opens it up per report.
 * Hardware has its own, older switch, read where the hardware is
 * (`getReportableHardware`).
 */
export const selectionFromSettings = (settings: Settings): ReportSelection => ({
  screenshot: settings.telemetryReportScreenshot,
  errors: settings.telemetryReportErrors,
  requests: settings.telemetryReportRequests,
  steps: settings.telemetryReportSteps,
  console: settings.telemetryReportConsole,
  variables: settings.telemetryReportVariables,
  data: settings.telemetryReportData,
  hardware: true,
});

/** The parts a report would carry, in words: "a screenshot, recent errors and failed requests". */
export const describeSelection = (
  selection: ReportSelection,
  has: Partial<Record<keyof ReportSelection, boolean>>,
): string => {
  const names: [keyof ReportSelection, string][] = [
    ["screenshot", "a screenshot"],
    ["errors", "recent errors"],
    ["requests", "failed requests"],
    ["steps", "the steps before this"],
    ["console", "console warnings"],
    ["hardware", "this computer's hardware"],
    ["data", "what this page loaded"],
  ];
  const parts = names.filter(([key]) => selection[key] && has[key]).map(([, name]) => name);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0];
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
};
