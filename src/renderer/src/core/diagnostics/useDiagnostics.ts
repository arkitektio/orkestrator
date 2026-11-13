import { useSyncExternalStore } from "react";
import { getDiagnostics, subscribeDiagnostics, type DiagnosticsSnapshot } from "./recorder";

/** The recorder's buffers, live. */
export const useDiagnostics = (): DiagnosticsSnapshot =>
  useSyncExternalStore(subscribeDiagnostics, getDiagnostics, getDiagnostics);
