import type { ReactNode } from "react";
import { dismissToast, pushToast, type ToastKind, type ToastOptions } from "./toasts";

/**
 * The app's `toast`, shown in the toast island: the rail's in a signed-in
 * window, a floating copy on the welcome screen and under the quick bar's
 * palette. There is no other toast surface.
 *
 * For a failure, prefer `reportError` / `reportErrorAs`: they turn the error
 * into a sentence and offer the raw text as "Copy details".
 */

type Message = (() => ReactNode) | ReactNode;

const kind =
  (k: ToastKind) =>
  (message: Message, options?: ToastOptions): string | number =>
    pushToast(k, message, options);

export const toast = Object.assign(kind("default"), {
  success: kind("success"),
  info: kind("info"),
  warning: kind("warning"),
  error: kind("error"),
  message: kind("default"),
  dismiss: (id?: string | number) => dismissToast(id),
});

export type { ToastAction, ToastOptions } from "./toasts";
export { ToastIsland } from "./ToastIsland";
export { describeError, isAbort, type DescribedError } from "./describeError";
export { installUnhandledErrorNet, reportError, UnhandledErrorNet, reportErrorAs, type ReportOptions } from "./reportError";
