import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { assertWebGPUSupported } from "@/core/lib/scene/gpu/webgpuSupport";
import { ExperimentSystemHost } from "./ExperimentSystemHost";
import { MIN_VISIBLE_SAMPLES } from "./experimentSystem";
import { FEATURE_SLICES } from "./featureSlices";
import { experimentScopeSignature } from "../platform/model/experimentStructure";
import {
  foldExperiment,
  type ExperimentLike,
  selectedLayers,
  type ServedExperimentLike,
  type SourceMemo,
} from "../platform/model/foldExperiment";
import {
  placementErrorsByLayerId,
  type GraphQLErrorLike,
} from "../platform/model/placementErrors";
import {
  ExperimentScopeStatusContext,
  type ExperimentScopeStatus,
} from "../platform/stores/experimentScope";
import {
  ExperimentStoreContext,
  createExperimentStore,
  type ExperimentLayerFragment,
  type ExperimentStoreApi,
} from "../platform/stores/experimentStore";

/** The fold is structural (no generated types); the fragments it passes on ARE the scene's. */
const typedRaw = (raw: Record<string, unknown>) => raw as Record<string, ExperimentLayerFragment>;
import {
  RangeStoreContext,
  createRangeStore,
  type RangeStoreApi,
  type TimeWindow,
} from "../platform/stores/rangeStore";
import {
  ViewerStoreContext,
  createViewerStore,
  type ViewerStoreApi,
} from "../platform/stores/viewerStore";

/**
 * Builds and maintains the experiment's store scope.
 *
 * Transposed from mikro's `shell/SceneProvider.tsx`, and it keeps that file's
 * load-bearing contract:
 *
 *  - **Rebuild** only when the SCOPE signature moves — a different experiment or a
 *    different world. That is the one change nothing built can survive.
 *  - **Fold** on every other fragment change: re-normalize (cheaply), keep every
 *    layer's pyramid by identity unless that layer's structure moved, and push the
 *    result into the live stores (which fold away the optimistic edits the server
 *    now agrees with). No store is recreated.
 *  - **`phase` comes from the scope signature ALONE.** A fold never pushes it back
 *    to "initializing", so the `<Canvas>` — and every GPU buffer under it — survives
 *    a layer arriving, an annotation being minted on first draw, or a re-placement.
 *
 * Contexts are ALWAYS mounted, with null values until ready: if the provider chain
 * appeared only on readiness, the transition would remount the whole page.
 * Consumers gate on `ExperimentGuard`, not on provider presence.
 */

type Scope = {
  experiment: ExperimentStoreApi;
  range: RangeStoreApi;
  viewer: ViewerStoreApi;
};


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
    () => (served ? selectedLayers<ExperimentLike & { id: string }>(served) : served),
    [served],
  );
  const [scope, setScope] = useState<Scope | null>(null);
  const [status, setStatus] = useState<ExperimentScopeStatus>({
    phase: "no-experiment",
    experimentId: null,
    error: null,
  });

  const scopeSignature = experiment ? experimentScopeSignature(experiment) : null;
  const memoRef = useRef<SourceMemo | null>(null);
  // Read at build time only — the URL range seeds the scope, it does not drive it.
  const initialRangeRef = useRef(initialRange ?? null);
  const annotatableRef = useRef(annotatable);
  annotatableRef.current = annotatable;
  const latestRef = useRef({ experiment, placementErrors });
  latestRef.current = { experiment, placementErrors };

  // --- REBUILD: identity or world changed -------------------------------------
  useEffect(() => {
    const current = latestRef.current.experiment;
    if (!current || !scopeSignature) {
      setScope(null);
      setStatus({ phase: "no-experiment", experimentId: null, error: null });
      return;
    }

    let cancelled = false;
    setScope(null);
    setStatus({ phase: "initializing", experimentId: current.id, error: null });

    if (!current.world) {
      // Not an error: there is simply no timeline, and no mutation to add one.
      setStatus({ phase: "no-world", experimentId: current.id, error: null });
      return;
    }

    assertWebGPUSupported()
      .then(() => {
        if (cancelled) return;
        const errors = placementErrorsByLayerId(current, latestRef.current.placementErrors);
        const folded = foldExperiment(current, errors, null);
        memoRef.current = folded.memo;

        const experimentStore = createExperimentStore({
          experimentId: current.id,
          world: current.world ?? null,
          annotatable: annotatableRef.current,
          layers: folded.layers,
          rawLayers: typedRaw(folded.rawLayers),
          timeOrigin: folded.timeOrigin,
          worldSpan: folded.worldSpan,
        });
        const minWidth = experimentStore.getState().finestPeriod * MIN_VISIBLE_SAMPLES;
        const rangeStore = createRangeStore({
          worldSpan: folded.worldSpan,
          minWidth,
          range: initialRangeRef.current,
        });

        setScope({
          experiment: experimentStore,
          range: rangeStore,
          viewer: createViewerStore(FEATURE_SLICES),
        });
        setStatus({ phase: "ready", experimentId: current.id, error: null });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const err = error instanceof Error ? error : new Error(String(error));
        setStatus({
          phase: err.name === "WebGPUUnavailableError" ? "unsupported" : "error",
          experimentId: current.id,
          error: err,
        });
      });

    return () => {
      cancelled = true;
    };
  }, [scopeSignature]);

  // --- FOLD: everything else ---------------------------------------------------
  useEffect(() => {
    if (!scope || !experiment) return;
    // A fragment for a DIFFERENT scope is the rebuild's business, not ours.
    if (experimentScopeSignature(experiment) !== scopeSignature) return;

    const errors = placementErrorsByLayerId(experiment, placementErrors);
    const folded = foldExperiment(experiment, errors, memoRef.current);
    memoRef.current = folded.memo;

    const { removedIds } = scope.experiment
      .getState()
      .syncLayers(folded.layers, typedRaw(folded.rawLayers), folded.worldSpan);
    for (const id of removedIds) scope.viewer.getState().clearLayer(id);
    // The range follows `worldSpan` through the system's subscription.
  }, [scope, experiment, placementErrors, scopeSignature]);

  const statusValue = useMemo(() => status, [status]);

  return (
    <ExperimentScopeStatusContext.Provider value={statusValue}>
      <ExperimentStoreContext.Provider value={scope?.experiment ?? null}>
        <RangeStoreContext.Provider value={scope?.range ?? null}>
          <ViewerStoreContext.Provider value={scope?.viewer ?? null}>
            {scope && <ExperimentSystemHost scope={scope} />}
            {children}
          </ViewerStoreContext.Provider>
        </RangeStoreContext.Provider>
      </ExperimentStoreContext.Provider>
    </ExperimentScopeStatusContext.Provider>
  );
};
