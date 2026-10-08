import { useEffect, useMemo, useRef, useState, type ComponentType, type ReactNode } from "react";
import type { StoreApi } from "zustand/vanilla";
import { assertWebGPUSupported } from "@/core/data/scene/gpu/webgpuSupport";
import { placementErrorsByLayerId, type GraphQLErrorLike } from "../model/placementErrors";
import { PlotStoreContext, type AnyPlotStoreState, type Span } from "../stores/plotStore";
import {
  RangeStoreContext,
  createRangeStore,
  type RangeStoreApi,
  type TimeWindow,
} from "../stores/rangeStore";
import {
  ViewerStoreContext,
  createViewerStore,
  type AnyViewerSlice,
  type LayoutMode,
  type ViewerStoreApi,
} from "../stores/viewerStore";
import { NO_SUBJECT, PlotScopeStatusContext, type PlotScopeStatus } from "./plotScope";

/**
 * Builds and maintains a plot's store scope — the provider behind elektro's
 * experiment timeline and mikro's chart.
 *
 * Transposed from mikro's `shell/SceneProvider.tsx`, and it keeps that file's
 * load-bearing contract:
 *
 *  - **Rebuild** only when the SCOPE signature moves — a different subject or a
 *    different world. That is the one change nothing built can survive.
 *  - **Fold** on every other fragment change: re-normalize (cheaply), keep every
 *    layer's source by identity unless that layer's structure moved, and push the
 *    result into the live stores (which fold away the optimistic edits the server
 *    now agrees with). No store is recreated.
 *  - **`phase` comes from the scope signature ALONE.** A fold never pushes it back
 *    to "initializing", so the `<Canvas>` — and every GPU buffer under it — survives
 *    a layer arriving, an annotation being minted on first draw, or a re-placement.
 *
 * Contexts are ALWAYS mounted, with null values until ready: if the provider chain
 * appeared only on readiness, the transition would remount the whole page.
 * Consumers gate on `PlotScopeGuard`, not on provider presence.
 *
 * What a subject IS — how it folds, what its store holds, which drivers its
 * system builds — is the module's, passed in as `spec`.
 */

export type PlotScope<Plot> = {
  plot: Plot;
  range: RangeStoreApi;
  viewer: ViewerStoreApi;
};

/** What a fold hands the stores. The module's own memo rides along in `Folded`. */
export type FoldedPlot<L, Raw> = {
  layers: L[];
  rawLayers: Record<string, Raw>;
  worldSpan: Span | null;
  timeOrigin: number;
};

export type PlotScopeSpec<
  Subject extends { id: string; layers?: readonly { id: string }[] | null },
  Folded extends FoldedPlot<unknown, unknown>,
  Plot extends StoreApi<any>,
> = {
  /** Identity + world: the one thing a scope cannot outlive. */
  scopeSignatureOf: (subject: Subject) => string;
  /** False → the "no-world" phase: nothing to lay anything along. */
  hasWorld: (subject: Subject) => boolean;
  /** Normalize. `previous` is the last fold's result (null on a rebuild). */
  fold: (subject: Subject, errors: ReadonlyMap<string, string>, previous: Folded | null) => Folded;
  /** Build the plot store for a new scope from its first fold. */
  createStore: (subject: Subject, folded: Folded) => Plot;
  /** Push a later fold into the live store; returns the layers that left. */
  sync: (plot: Plot, folded: Folded) => { removedIds: string[] };
  /** How many finest-level samples the narrowest window must still show. */
  minVisibleSamples: number;
  /** The module's feature slices of the viewer store. */
  featureSlices: readonly AnyViewerSlice[];
  /** The row layout a new scope starts in. */
  layoutMode?: LayoutMode;
  /** Hosts the module's drivers for a scope; mounted once the scope is ready. */
  System: ComponentType<{ scope: PlotScope<Plot> }>;
};

export const PlotScopeProvider = <
  Subject extends { id: string; layers?: readonly { id: string }[] | null },
  Folded extends FoldedPlot<unknown, unknown>,
  Plot extends StoreApi<any>,
>({
  subject,
  spec,
  placementErrors,
  initialRange,
  children,
}: {
  subject: Subject | null | undefined;
  /** Read through a ref: its identity never rebuilds or refolds anything. */
  spec: PlotScopeSpec<Subject, Folded, Plot>;
  /** The scene query's GraphQL errors — read, not discarded (see placementErrors.ts). */
  placementErrors?: readonly GraphQLErrorLike[] | null;
  /** A window restored from the URL, applied when the scope is built. */
  initialRange?: TimeWindow | null;
  children: ReactNode;
}) => {
  const [scope, setScope] = useState<PlotScope<Plot> | null>(null);
  const [status, setStatus] = useState<PlotScopeStatus>(NO_SUBJECT);

  const specRef = useRef(spec);
  specRef.current = spec;
  const scopeSignature = subject ? spec.scopeSignatureOf(subject) : null;
  const foldedRef = useRef<Folded | null>(null);
  // Read at build time only — the URL range seeds the scope, it does not drive it.
  const initialRangeRef = useRef(initialRange ?? null);
  const latestRef = useRef({ subject, placementErrors });
  latestRef.current = { subject, placementErrors };

  // --- REBUILD: identity or world changed -------------------------------------
  useEffect(() => {
    const current = latestRef.current.subject;
    if (!current || !scopeSignature) {
      setScope(null);
      setStatus(NO_SUBJECT);
      return;
    }

    let cancelled = false;
    setScope(null);
    setStatus({ phase: "initializing", subjectId: current.id, error: null });

    if (!specRef.current.hasWorld(current)) {
      // Not an error: there is simply no axis, and nothing here can add one.
      setStatus({ phase: "no-world", subjectId: current.id, error: null });
      return;
    }

    assertWebGPUSupported()
      .then(() => {
        if (cancelled) return;
        const s = specRef.current;
        const errors = placementErrorsByLayerId(current, latestRef.current.placementErrors);
        const folded = s.fold(current, errors, null);
        foldedRef.current = folded;

        const plot = s.createStore(current, folded);
        const finestPeriod = (plot.getState() as AnyPlotStoreState).finestPeriod;
        const range = createRangeStore({
          worldSpan: folded.worldSpan,
          minWidth: finestPeriod * s.minVisibleSamples,
          range: initialRangeRef.current,
        });

        setScope({
          plot,
          range,
          viewer: createViewerStore(s.featureSlices, { layoutMode: s.layoutMode }),
        });
        setStatus({ phase: "ready", subjectId: current.id, error: null });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const err = error instanceof Error ? error : new Error(String(error));
        setStatus({
          phase: err.name === "WebGPUUnavailableError" ? "unsupported" : "error",
          subjectId: current.id,
          error: err,
        });
      });

    return () => {
      cancelled = true;
    };
  }, [scopeSignature]);

  // --- FOLD: everything else ---------------------------------------------------
  useEffect(() => {
    if (!scope || !subject) return;
    const s = specRef.current;
    // A fragment for a DIFFERENT scope is the rebuild's business, not ours.
    if (s.scopeSignatureOf(subject) !== scopeSignature) return;

    const errors = placementErrorsByLayerId(subject, placementErrors);
    const folded = s.fold(subject, errors, foldedRef.current);
    foldedRef.current = folded;

    const { removedIds } = s.sync(scope.plot, folded);
    for (const id of removedIds) scope.viewer.getState().clearLayer(id);
    // The range follows `worldSpan` through the system's subscription.
  }, [scope, subject, placementErrors, scopeSignature]);

  const statusValue = useMemo(() => status, [status]);
  const System = spec.System;

  return (
    <PlotScopeStatusContext.Provider value={statusValue}>
      <PlotStoreContext.Provider
        value={(scope?.plot ?? null) as StoreApi<AnyPlotStoreState> | null}
      >
        <RangeStoreContext.Provider value={scope?.range ?? null}>
          <ViewerStoreContext.Provider value={scope?.viewer ?? null}>
            {scope && <System scope={scope} />}
            {children}
          </ViewerStoreContext.Provider>
        </RangeStoreContext.Provider>
      </PlotStoreContext.Provider>
    </PlotScopeStatusContext.Provider>
  );
};

/**
 * The range follows the plot's extent, whoever moves it: a fold (a layer
 * arriving) or a layer reporting what it read (a table). Returns the unsubscribe —
 * a system runs it FIRST on dispose, before its drivers write on their way out.
 */
export const followWorldSpan = (
  plot: StoreApi<{ worldSpan: Span | null; finestPeriod: number }>,
  range: RangeStoreApi,
  minVisibleSamples: number,
): (() => void) =>
  plot.subscribe((state, previous) => {
    if (state.worldSpan === previous.worldSpan) return;
    range.getState().setWorld(state.worldSpan, state.finestPeriod * minVisibleSamples);
  });
