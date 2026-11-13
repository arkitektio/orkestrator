import type { RecordedError } from "./recorder";

/**
 * Asking for the bug report dialog, from anywhere: a toast, an error page, a
 * menu, the palette. A function and not a hook on the dialog system, because
 * the askers include `core/notify`, which the dialog system itself is built
 * on; `ReportHost` (mounted once, inside the dialog provider) answers.
 */
export type ReportRequest = {
  /** The error the report is about, when it is opened from one. */
  pinned?: RecordedError | null;
};

type Handler = (request: ReportRequest) => void;

let handler: Handler | null = null;

/** The one place that opens the dialog; returns its removal. */
export const setReportHandler = (next: Handler) => {
  handler = next;
  return () => {
    if (handler === next) handler = null;
  };
};

export const requestReport = (request: ReportRequest = {}): void => {
  if (handler) handler(request);
  else console.error("A bug report was asked for where nothing can show it (no ReportHost mounted).");
};
