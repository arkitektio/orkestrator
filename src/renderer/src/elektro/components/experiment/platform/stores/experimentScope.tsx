import {
  phaseMessageWith,
  type PhaseWording,
  type PlotScopeStatus,
} from "@/core/data/plot/scope/plotScope";

/**
 * The experiment scope's lifecycle. The phases, the status context and the guard
 * are the plot engine's (`@/core/data/plot/scope/plotScope`); the wording for
 * them is the experiment's.
 *
 * `no-world` is its own phase, not an error: an experiment created without a world
 * has no timeline, and there is no `updateExperiment` to give it one. The UI must
 * say that, rather than "failed to load".
 */
export {
  PlotScopeGuard as ExperimentGuard,
  PlotScopeStatusContext as ExperimentScopeStatusContext,
  usePlotScopeStatus as useExperimentScopeStatus,
  type PlotScopePhase as ExperimentScopePhase,
  type PlotScopeStatus as ExperimentScopeStatus,
} from "@/core/data/plot/scope/plotScope";

const WORDING: PhaseWording = {
  noSubject: "No experiment",
  initializing: "Preparing the timeline…",
  noWorld: "This experiment has no timeline to lay its recordings on.",
  error: "The experiment could not be prepared.",
};

/** Human wording for a non-ready phase — shared by the viewport and the sidebar tabs. */
export const phaseMessage = (status: PlotScopeStatus): string => phaseMessageWith(status, WORDING);
