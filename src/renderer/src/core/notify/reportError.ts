import { useEffect } from "react";
import { describeError, isAbort, type DescribedError } from "./describeError";
import { pushToast, type ToastAction } from "./toasts";

/**
 * How a caller reports a failure it has no place of its own for: one error
 * toast in the island. The caller owns its errors — a mutation wrapper reports
 * nothing — so every `mutate()` outside a dialog ends in
 * `.catch(reportErrorAs("Couldn't move the folder"))` or a try/catch that
 * calls `reportError`. Inside a dialog, a submit reports inline instead
 * (`useDialogSubmit`).
 */
export type ReportOptions = {
  /** What failed, as the headline: "Couldn't move the folder". */
  title: string;
  /** One id per call site: a repeat replaces the toast instead of stacking. */
  id?: string | number;
  /** A module's own reading of its error codes; defaults to `describeError`. */
  describe?: (error: unknown) => DescribedError;
  action?: ToastAction;
};

/** Errors already shown, so the unhandled-rejection net does not show them twice. */
const reported = new WeakSet<object>();

export const wasReported = (error: unknown) =>
  !!error && typeof error === "object" && reported.has(error);

export const markReported = (error: unknown) => {
  if (error && typeof error === "object") reported.add(error);
};

export const reportError = (error: unknown, options: ReportOptions | string): string | number | null => {
  if (isAbort(error)) return null;
  const { title, id, describe = describeError, action } = typeof options === "string" ? { title: options } : options;
  const described = describe(error);
  markReported(error);
  return pushToast("error", title, {
    id,
    description: described.message,
    technical: described.technical || undefined,
    action,
  });
};

/** `reportError` for a `.catch`: `mutate(...).catch(reportErrorAs("Couldn't save"))`. */
export const reportErrorAs =
  (options: ReportOptions | string) =>
  (error: unknown): void => {
    reportError(error, options);
  };

const isApolloError = (error: unknown) =>
  !!error && typeof error === "object" && "graphQLErrors" in error && "networkError" in error;

/**
 * The net under "the caller owns its errors": a mutation whose rejection
 * nobody caught still reaches the island, and the console names it as a bug.
 * Installed once per window; returns its removal.
 */
export const installUnhandledErrorNet = () => {
  const onRejection = (event: PromiseRejectionEvent) => {
    const error = event.reason;
    if (!isApolloError(error) || wasReported(error) || isAbort(error)) return;
    console.warn("A failed request was not handled by its caller; reporting it for them.", error);
    reportError(error, { title: "Something failed", id: "unhandled-request" });
    event.preventDefault();
  };
  window.addEventListener("unhandledrejection", onRejection);
  return () => window.removeEventListener("unhandledrejection", onRejection);
};

/** `installUnhandledErrorNet` for as long as it is mounted; mounted once by the app. */
export const UnhandledErrorNet = () => {
  useEffect(installUnhandledErrorNet, []);
  return null;
};
