import { useMemo, useRef, type ReactNode } from "react";
import type { GraphQLErrorLike } from "@/core/data/plot/model/placementErrors";
import {
  PlotScopeProvider,
  type PlotScope,
  type PlotScopeSpec,
} from "@/core/data/plot/scope/PlotScopeProvider";
import type { TimeWindow } from "@/core/data/plot/stores/rangeStore";
import { ExperimentSystemHost } from "./ExperimentSystemHost";
import { MIN_VISIBLE_SAMPLES } from "./experimentSystem";
import { FEATURE_SLICES } from "./featureSlices";
import { experimentScopeSignature } from "../platform/model/experimentStructure";
import {
  foldExperiment,
  type ExperimentLike,
  type FoldedExperiment,
  selectedLayers,
  type ServedExperimentLike,
} from "../platform/model/foldExperiment";
import {
  createExperimentStore,
  type ExperimentLayerFragment,
  type ExperimentStoreApi,
} from "../platform/stores/experimentStore";

/** The fold is structural (no generated types); the fragments it passes on ARE the scene's. */
const typedRaw = (raw: Record<string, unknown>) => raw as Record<string, ExperimentLayerFragment>;

/**
 * Builds and maintains the experiment's store scope.
 *
 * The rebuild / fold / phase contract is the plot engine's
 * (`@/core/data/plot/scope/PlotScopeProvider`, transposed from mikro's
 * `shell/SceneProvider.tsx`): rebuild only when the scope signature moves, fold
 * everything else into the live stores, and never let a fold push the phase back
 * to "initializing". This file says what an EXPERIMENT is to it: how it folds,
 * what its store holds, and which system hosts its drivers.
 *
 * Consumers gate on `ExperimentGuard`, not on provider presence.
 */

type Subject = ExperimentLike & { id: string };

/** The system host reads the plot store as the experiment's. */
const System = ({ scope }: { scope: PlotScope<ExperimentStoreApi> }) => (
  <ExperimentSystemHost scope={{ experiment: scope.plot, range: scope.range, viewer: scope.viewer }} />
);

/**
 * What the provider builds a scope from: an experiment's scene fragment, which
 * may list layer kinds the query does not select (dropped at intake).
 */
export type SceneSource = ServedExperimentLike<ExperimentLike & { id: string }>;

export const ExperimentSceneProvider = ({
  experiment: served,
  placementErrors,
  initialRange,
  annotatable = true,
  children,
}: {
  experiment: SceneSource | null | undefined;
  /**
   * Whether marks can be drawn (`createAnnotation(experiment:)`). A host showing
   * an experiment read-only passes false and the drawing modes are not offered.
   */
  annotatable?: boolean;
  /** The scene query's GraphQL errors — read, not discarded (see placementErrors.ts). */
  placementErrors?: readonly GraphQLErrorLike[] | null;
  /** A window restored from the URL, applied when the scope is built. */
  initialRange?: TimeWindow | null;
  children: ReactNode;
}) => {
  const experiment = useMemo(
    () => (served ? selectedLayers<Subject>(served) : served),
    [served],
  );
  // Read when a scope is built, not a reason to build one.
  const annotatableRef = useRef(annotatable);
  annotatableRef.current = annotatable;

  const spec = useMemo<PlotScopeSpec<Subject, FoldedExperiment, ExperimentStoreApi>>(
    () => ({
      scopeSignatureOf: experimentScopeSignature,
      hasWorld: (current) => current.world != null,
      fold: (current, errors, previous) => foldExperiment(current, errors, previous?.memo ?? null),
      createStore: (current, folded) =>
        createExperimentStore({
          experimentId: current.id,
          world: current.world ?? null,
          annotatable: annotatableRef.current,
          layers: folded.layers,
          rawLayers: typedRaw(folded.rawLayers),
          timeOrigin: folded.timeOrigin,
          worldSpan: folded.worldSpan,
        }),
      sync: (plot, folded) =>
        plot.getState().syncLayers(folded.layers, typedRaw(folded.rawLayers), folded.worldSpan),
      minVisibleSamples: MIN_VISIBLE_SAMPLES,
      featureSlices: FEATURE_SLICES,
      System,
    }),
    [],
  );

  return (
    <PlotScopeProvider
      subject={experiment}
      spec={spec}
      placementErrors={placementErrors}
      initialRange={initialRange}
    >
      {children}
    </PlotScopeProvider>
  );
};
