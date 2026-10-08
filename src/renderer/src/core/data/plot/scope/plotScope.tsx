import { createContext, useContext, type ReactNode } from "react";

/**
 * A plot scope's lifecycle, and the guard that gates on it.
 *
 * `phase` is computed from the SCOPE signature alone (identity + world). A layer
 * change must never push it back to "initializing", or the `<Canvas>` unmounts
 * and every GPU buffer is disposed — the failure the rebuild/reconcile split
 * exists to prevent.
 *
 * `no-world` is its own phase, not an error: a subject without a world has no
 * axis to lay anything along. The UI must say that, rather than "failed to
 * load".
 */
export type PlotScopePhase =
  | "no-subject"
  | "initializing"
  | "no-world"
  | "unsupported"
  | "error"
  | "ready";

export type PlotScopeStatus = {
  phase: PlotScopePhase;
  /** The id of what the scope was built for: an experiment, a chart. */
  subjectId: string | null;
  error: Error | null;
};

export const NO_SUBJECT: PlotScopeStatus = { phase: "no-subject", subjectId: null, error: null };

export const PlotScopeStatusContext = createContext<PlotScopeStatus>(NO_SUBJECT);

export const usePlotScopeStatus = (): PlotScopeStatus => useContext(PlotScopeStatusContext);

/**
 * Render children only once the scope is ready.
 *
 * KEYED on the subject id: navigating from one experiment (or chart) to another
 * remounts the subtree rather than repopulating it, so no component can carry
 * state from the previous one into the next.
 */
export const PlotScopeGuard = ({
  children,
  fallback = null,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) => {
  const status = usePlotScopeStatus();
  if (status.phase !== "ready") return <>{fallback}</>;
  return <GuardKeyed key={status.subjectId ?? ""}>{children}</GuardKeyed>;
};

const GuardKeyed = ({ children }: { children: ReactNode }) => <>{children}</>;

/** The module's wording for the phases that name its own subject. */
export type PhaseWording = {
  noSubject: string;
  initializing: string;
  noWorld: string;
  error: string;
};

/** Human wording for a non-ready phase — shared by a viewport and its sidebar tabs. */
export const phaseMessageWith = (status: PlotScopeStatus, wording: PhaseWording): string => {
  switch (status.phase) {
    case "no-subject":
      return wording.noSubject;
    case "initializing":
      return wording.initializing;
    case "no-world":
      return wording.noWorld;
    case "unsupported":
      // An environment problem, not a data one — do not say "failed to load".
      return status.error?.message ?? "This viewer needs WebGPU, which is unavailable here.";
    case "error":
      return status.error?.message ?? wording.error;
    default:
      return "";
  }
};
