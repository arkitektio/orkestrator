import { createContext, useContext, type ReactNode } from "react";

/**
 * The scope's lifecycle, and the guard that gates on it.
 *
 * Lives in `platform/` (not `shell/`) so features can gate on readiness without
 * importing the shell — the same placement mikro gives `platform/stores/sceneScope`.
 *
 * `phase` is computed from the SCOPE signature alone (identity + world). A view
 * change must never push it back to "initializing", or the `<Canvas>` unmounts and
 * every GPU buffer is disposed — the failure the rebuild/reconcile split exists to
 * prevent.
 *
 * `no-world` is its own phase, not an error: an experiment created without a world
 * has no timeline, and there is no `updateExperiment` to give it one. The UI must
 * say that, rather than "failed to load".
 */
export type ExperimentScopePhase =
  | "no-experiment"
  | "initializing"
  | "no-world"
  | "unsupported"
  | "error"
  | "ready";

export type ExperimentScopeStatus = {
  phase: ExperimentScopePhase;
  experimentId: string | null;
  error: Error | null;
};

const DEFAULT_STATUS: ExperimentScopeStatus = {
  phase: "no-experiment",
  experimentId: null,
  error: null,
};

export const ExperimentScopeStatusContext =
  createContext<ExperimentScopeStatus>(DEFAULT_STATUS);

export const useExperimentScopeStatus = (): ExperimentScopeStatus =>
  useContext(ExperimentScopeStatusContext);

/**
 * Render children only once the scope is ready.
 *
 * KEYED on the experiment id: navigating from one experiment to another remounts
 * the subtree rather than repopulating it, so no component can carry state from the
 * previous experiment into the next.
 */
export const ExperimentGuard = ({
  children,
  fallback = null,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) => {
  const status = useExperimentScopeStatus();
  if (status.phase !== "ready") return <>{fallback}</>;
  return <GuardKeyed key={status.experimentId ?? ""}>{children}</GuardKeyed>;
};

const GuardKeyed = ({ children }: { children: ReactNode }) => <>{children}</>;

/** Human wording for a non-ready phase — shared by the viewport and the sidebar tabs. */
export const phaseMessage = (status: ExperimentScopeStatus): string => {
  switch (status.phase) {
    case "no-experiment":
      return "No experiment";
    case "initializing":
      return "Preparing the timeline…";
    case "no-world":
      return "This experiment has no timeline to lay its recordings on.";
    case "unsupported":
      // An environment problem, not a data one — do not say "failed to load".
      return status.error?.message ?? "This viewer needs WebGPU, which is unavailable here.";
    case "error":
      return status.error?.message ?? "The experiment could not be prepared.";
    default:
      return "";
  }
};
