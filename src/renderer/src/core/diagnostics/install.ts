import { recordConsole, recordError } from "./recorder";

let installed = false;

/**
 * Starts recording what only the window can tell: console warnings and
 * errors, and whatever was thrown without anybody catching it. Called once,
 * before React mounts (`main.tsx`). The console keeps working as it did: the
 * original function is always called, and a failure to record is swallowed.
 */
export const installDiagnostics = (): void => {
  if (installed || typeof window === "undefined") return;
  installed = true;

  (["warn", "error"] as const).forEach((level) => {
    const original = console[level].bind(console);
    console[level] = (...args: unknown[]) => {
      try {
        recordConsole(level, args);
      } catch {
        // Recording must never break logging.
      }
      original(...args);
    };
  });

  window.addEventListener("error", (event) => {
    recordError(event.error ?? event.message, { source: "uncaught" });
  });
  window.addEventListener("unhandledrejection", (event) => {
    recordError(event.reason, { source: "uncaught" });
  });
};
