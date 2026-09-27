import type { ReactNode } from "react";
import { toast as sonner, type ExternalToast } from "sonner";
import { dismissToast, pushToast, toastIslandMounted, type ToastKind } from "./toasts";

/**
 * The app's `toast`: sonner's call shape, shown in the rail's toast island.
 *
 * A window with no island (the sign-in screen, the quick bar, anything without
 * the rail) falls back to sonner's floating toast, so a call site never has to
 * know where it runs. Import this instead of `sonner`; import `sonner` itself
 * only for a toast that must float.
 */

type Message = (() => ReactNode) | ReactNode;

const route = (kind: ToastKind, sonnerCall: (message: Message, data?: ExternalToast) => string | number) =>
  (message: Message, data?: ExternalToast): string | number =>
    toastIslandMounted() ? pushToast(kind, message, data) : sonnerCall(message, data);

export const toast = Object.assign(route("default", (m, d) => sonner(m, d)), {
  success: route("success", (m, d) => sonner.success(m, d)),
  info: route("info", (m, d) => sonner.info(m, d)),
  warning: route("warning", (m, d) => sonner.warning(m, d)),
  error: route("error", (m, d) => sonner.error(m, d)),
  message: route("default", (m, d) => sonner.message(m, d)),
  dismiss: (id?: string | number) => {
    dismissToast(id);
    sonner.dismiss(id);
  },
});

export { ToastIsland } from "./ToastIsland";
