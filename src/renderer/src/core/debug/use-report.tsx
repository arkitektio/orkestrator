import { describeError } from "@/core/notify/describeError";
import { currentRoute, getDiagnostics, type RecordedError } from "@/core/diagnostics/recorder";
import { requestReport } from "@/core/diagnostics/requestReport";
import { buildReport, DEFAULT_SELECTION, renderMarkdown } from "@/core/diagnostics/report";
import { hardwareReportLines } from "@/core/settings/renderer/hardwareReport";
import { getReportableHardware } from "@/core/settings/renderer/rendererBudget";
import { useCallback, useRef } from "react";

/**
 * What a report says about this computer: the detected hardware, unless the
 * user switched that off in Settings → Telemetry. Read when the report is
 * filed, so it follows the setting as it is then.
 */
const reportHardware = (): string[] | undefined => {
  const hardware = getReportableHardware();
  return hardware ? hardwareReportLines(hardware) : undefined;
};

/** An error as the report pins it: the sentence, and the raw text behind it. */
export const pinError = (error: unknown, title?: string): RecordedError => {
  const described = describeError(error);
  const stack = error instanceof Error && error.stack ? `\n${error.stack}` : "";
  return {
    at: Date.now(),
    route: currentRoute(),
    source: "page",
    title,
    message: described.message,
    technical: `${described.technical}${stack}`,
  };
};

/**
 * "Report a bug": asks for the report dialog (`core/diagnostics`), which
 * opens with a picture of the window as it is now. Pass the error a report is
 * about (`error`, or `pinned` when only its text is left) and it leads the
 * report.
 *
 * The returned function takes no arguments, so it can be an `onClick`.
 */
export const useReport = (about?: { error?: unknown; pinned?: RecordedError; title?: string }) => {
  const latest = useRef(about);
  latest.current = about;

  return useCallback(() => {
    const { error, pinned, title } = latest.current ?? {};
    requestReport({ pinned: pinned ?? (error ? pinError(error, title) : null) });
  }, []);
};

/**
 * The report from the outermost error boundary, where nothing of the app is
 * left to open a dialog in: straight to a prefilled issue, carrying the error
 * and what the recorder holds.
 */
export const useFatalReport = () => {
  const reportBug = async (error: Error) => {
    const info = await window.api.diagnostics?.info().catch(() => null);
    const report = buildReport(
      {
        description: `The app stopped with: ${error.message}`,
        pinned: pinError(error),
        environment: {
          appVersion: info?.appVersion ?? "unknown",
          platform: info ? `${info.platform} ${info.arch}` : navigator.userAgent,
          route: currentRoute(),
        },
        record: getDiagnostics(),
        hardware: reportHardware(),
        scrub: info?.scrub,
      },
      { ...DEFAULT_SELECTION, console: false },
    );
    await window.api.reportIssue({
      title: `Fatal Error: ${error.message}`,
      includeScreenshot: true,
      labels: ["bug", "critical"],
      template: "bug_report.md",
      body: renderMarkdown(report, { limit: 5000 }),
    });
  };

  return reportBug;
};
