import type { MikroClient } from "@/lib/zarr/store/types";
import type { AxisCoords } from "../coords/axisPath";
import { createSparseProfileReader } from "../sparse/sparseProfile";
import {
  hopMetaOf,
  isMeshSample,
  isNetworkSample,
  isSparseHop,
  type AttributeColumnLike,
  type AttributeHopLike,
  type AttributePlanLike,
  type AttributeRow,
  type HopMeta,
  type PlanRowsState,
} from "./attributeTypes";
import {
  EMPTY_SELECTION,
  executeOptionsFor,
  selectHops,
  selectionSignature,
  type AttributeSelection,
} from "./attributeSelection";
import {
  createExactSampler,
  type OpenedZarrArray,
} from "./exactSampleSource";
import { createLookupEngine } from "./createLookupEngine";
import {
  executePlanAt,
  executePlanWithValue,
  peekPlanWithValue,
  type ExecutePlanDeps,
  type ExecutePlanOptions,
  type PlanHopStates,
} from "./executePlan";
import type { AttributeLookupEngine } from "./lookupEngine";
import { LruMap } from "./lruMap";
import type { HeldValue } from "./planExec";
import { AttributePlanCache, type QueryClient } from "./planCache";

/**
 * The standalone "what are the attributes at this point?" service: given a
 * coordinate-system id and named coordinates in its level-0 frame, discover
 * the system's attribute plans (cached), sample each plan's field array (the
 * scene-free exact path), and look the values up with DuckDB — no mounted
 * <Scene> required. The scene's probe tracker runs on the SAME service (its
 * resident fast path and coordinate assembly stay scene-side), so scene and
 * non-scene consumers share one engine, one plan cache, one result LRU.
 *
 * Lifecycle: `acquireAttributeService` ref-counts one service per
 * (client, datalayer); `dispose()` closes the engine and empties every cache.
 * All caches are bounded (engine LRUs, plan-cache system cap, foreign-array
 * cap, results cap) so an app-lifetime service cannot grow without limit.
 *
 * Guard convention: everything here is imperative GraphQL — hosts mount the
 * React surface (AttributeServiceProvider) under Guard.Mikro.
 */

export type AttributeServiceClient = QueryClient & MikroClient;

export type AttributeServiceOptions = {
  client: AttributeServiceClient;
  datalayer: string;
  /** Cap on concurrently-held foreign zarr arrays. */
  foreignArrayCap?: number;
  /** Cap on systems with cached plan discovery. */
  planCacheCap?: number;
  /** Cap on cached whole-point results (`peekAttributesAt`). */
  resultCap?: number;
};

export type AttributesAtInput = {
  systemId: string;
  /** Named integer coordinates in the system's level-0 frame. */
  coords: AxisCoords;
  /** Which hops run and what they select; the defaults when omitted. */
  selection?: AttributeSelection;
  signal?: AbortSignal;
};

/** One hop's outcome, with the display metadata the caller needs to render it. */
export type PlanAttributesResult = HopMeta & { state: PlanRowsState };

/** Which hops to peek and what they select — the executor's selection slice. */
export type PeekPlanOptions = Pick<ExecutePlanOptions, "hops" | "columnsFor" | "sparseLimit">;

export interface AttributeService {
  /**
   * Run the selected hops of every plan of `systemId` at `coords`. One entry
   * per hop that ran; an aborted request resolves to what settled before the
   * abort (callers usually discard on abort anyway). Rejects on
   * plan-discovery failure.
   */
  attributesAt(input: AttributesAtInput): Promise<readonly PlanAttributesResult[]>;
  /** Synchronous cache-only answer for a point this service already ran. */
  peekAttributesAt(
    input: Omit<AttributesAtInput, "signal">,
  ): readonly PlanAttributesResult[] | null;
  /** The system's plans (discovery cached; empty array = none attached). */
  plansFor(systemId: string): Promise<readonly AttributePlanLike[]>;
  peekPlans(systemId: string): readonly AttributePlanLike[] | null;
  /** Pre-pay a system's fixed costs (discovery, secrets, statements, a
   * matrix's `indptr`) for the hops the selection runs. */
  warm(systemId: string, selection?: AttributeSelection): Promise<void>;
  /** Pre-pay ONE hop's fixed costs — for hosts that warm per plan as
   * discovery lands. */
  warmHop(plan: AttributePlanLike, hop: AttributeHopLike): void;
  followReference(
    column: AttributeColumnLike,
    value: HeldValue,
  ): Promise<readonly AttributeRow[] | null>;
  peekReference(
    column: AttributeColumnLike,
    value: HeldValue,
  ): readonly AttributeRow[] | null;
  /** Host hooks (the scene tracker): shared executor + cache-only peek. */
  executePlanAt(
    plan: AttributePlanLike,
    coords: AxisCoords,
    opts?: ExecutePlanOptions,
  ): Promise<PlanHopStates | null>;
  /** The value-KNOWN executor (mesh instance picks): skips the field-array
   * sample, everything else identical. */
  executePlanWithValue(
    plan: AttributePlanLike,
    coords: AxisCoords,
    value: HeldValue,
    opts?: Omit<ExecutePlanOptions, "sampleSync">,
  ): Promise<PlanHopStates | null>;
  /** The whole chain from caches alone, for an already-mapped point and a
   * value in hand; null on the first miss. */
  peekPlanWithValue(
    plan: AttributePlanLike,
    mapped: AxisCoords,
    value: HeldValue,
    sampleSource: "resident" | "exact",
    opts?: PeekPlanOptions,
  ): PlanHopStates | null;
  /** Attach/detach a host's already-open arrays (scene registry). */
  registerArrayProvider(
    provider: ((storeId: string) => OpenedZarrArray | null) | null,
  ): void;
  /** Drop cached plan discovery (edge changed on the server). */
  invalidate(systemId?: string): void;
  dispose(): void;
  /** The underlying engine, for ad-hoc column reads (pickers, LUTs). */
  readonly engine: AttributeLookupEngine;
}

const DEFAULT_RESULT_CAP = 64;

const pointKey = (systemId: string, coords: AxisCoords, selection: AttributeSelection): string =>
  `${systemId}|${Object.keys(coords)
    .sort()
    .map((axis) => `${axis}=${coords[axis]}`)
    .join(",")}|${selectionSignature(selection)}`;

export function createAttributeService(
  options: AttributeServiceOptions,
): AttributeService {
  const engine = createLookupEngine(options.client, options.datalayer);
  const sparse = createSparseProfileReader({
    client: options.client,
    datalayer: options.datalayer,
  });
  const planCache = new AttributePlanCache(options.client, options.planCacheCap);
  const sampler = createExactSampler({
    client: options.client,
    datalayer: options.datalayer,
    foreignArrayCap: options.foreignArrayCap,
  });
  /** Whole-point results, so repeat asks (hover re-entry) answer instantly. */
  const results = new LruMap<readonly PlanAttributesResult[]>(
    options.resultCap ?? DEFAULT_RESULT_CAP,
  );

  const execDeps: ExecutePlanDeps = {
    engine,
    sparse,
    sampleExact: (plan: AttributePlanLike, index: readonly number[]) =>
      // Mesh and network samples have no array; executePlanAt guards earlier,
      // this is type-narrowing plus defense in depth.
      isMeshSample(plan.sample) || isNetworkSample(plan.sample)
        ? Promise.resolve(null)
        : sampler.readExact(plan.sample.store, index).catch(() => null),
  };

  /** The states of one plan's run as per-hop results, in chain order. */
  const toResults = (
    plan: AttributePlanLike,
    hops: readonly AttributeHopLike[],
    states: PlanHopStates,
  ): PlanAttributesResult[] =>
    hops.flatMap((hop) => {
      const meta = hopMetaOf(plan, hop);
      const state = states[meta.hopKey];
      return state ? [{ ...meta, state }] : [];
    });

  const warmHop = (plan: AttributePlanLike, hop: AttributeHopLike): void => {
    if (isSparseHop(hop)) sparse.warm(plan, hop);
    else engine.warm(plan, hop);
  };

  const service: AttributeService = {
    engine,

    async attributesAt({ systemId, coords, selection = EMPTY_SELECTION, signal }) {
      const cached = results.get(pointKey(systemId, coords, selection));
      if (cached !== undefined) return cached;
      const isStale = () => !!signal?.aborted;
      const plans = await planCache.get(systemId);
      const settled = await Promise.all(
        plans.map(async (plan) => {
          const hops = selectHops(selection, plan);
          if (hops.length === 0) return [];
          const states = await executePlanAt(execDeps, plan, coords, {
            isStale,
            ...executeOptionsFor(selection, plan),
          });
          return states === null ? null : toResults(plan, hops, states);
        }),
      );
      const complete = settled.flatMap((entry) => entry ?? []);
      // Cache only complete, uninterrupted answers.
      if (!signal?.aborted && settled.every((entry) => entry !== null)) {
        results.set(pointKey(systemId, coords, selection), complete);
      }
      return complete;
    },

    peekAttributesAt({ systemId, coords, selection = EMPTY_SELECTION }) {
      return results.get(pointKey(systemId, coords, selection)) ?? null;
    },

    plansFor(systemId) {
      return planCache.get(systemId);
    },

    peekPlans(systemId) {
      return planCache.peek(systemId);
    },

    async warm(systemId, selection = EMPTY_SELECTION) {
      const plans = await planCache.get(systemId);
      for (const plan of plans) {
        for (const hop of selectHops(selection, plan)) warmHop(plan, hop);
      }
    },

    warmHop,

    followReference(column, value) {
      return engine.followReference(column, value);
    },

    peekReference(column, value) {
      return engine.peekReference(column, value);
    },

    executePlanAt(plan, coords, opts) {
      return executePlanAt(execDeps, plan, coords, opts);
    },

    executePlanWithValue(plan, coords, value, opts) {
      return executePlanWithValue(execDeps, plan, coords, value, opts);
    },

    peekPlanWithValue(plan, mapped, value, sampleSource, opts) {
      return peekPlanWithValue(execDeps, plan, mapped, value, sampleSource, opts);
    },

    registerArrayProvider(provider) {
      sampler.registerArrayProvider(provider);
    },

    invalidate(systemId) {
      planCache.invalidate(systemId);
      results.drain();
    },

    dispose() {
      engine.dispose();
      sparse.dispose();
      sampler.dispose();
      planCache.invalidate();
      results.drain();
    },
  };

  return service;
}

// ---- ref-counted registry ---------------------------------------------------

type RegistryEntry = {
  service: AttributeService;
  refs: number;
  linger: ReturnType<typeof setTimeout> | null;
};

/**
 * One service per (client, datalayer), shared by every acquirer — the scene,
 * hover cards, tables — so they hit the same warm caches and the one DuckDB
 * connection. INTENTIONAL module-level state: WeakMap-keyed on the client
 * object, so a torn-down Apollo client can never pin a service; entries
 * linger 30s at zero refs before disposing, so route changes don't thrash
 * the DuckDB connection.
 *
 * Creation-time options (caps) apply on FIRST creation per key; later
 * acquirers share the existing instance.
 */
const registry = new WeakMap<object, Map<string, RegistryEntry>>();
const DISPOSE_LINGER_MS = 30_000;

export function acquireAttributeService(options: AttributeServiceOptions): {
  service: AttributeService;
  release: () => void;
} {
  let byDatalayer = registry.get(options.client);
  if (!byDatalayer) {
    byDatalayer = new Map();
    registry.set(options.client, byDatalayer);
  }
  const existing = byDatalayer.get(options.datalayer);
  const entry: RegistryEntry = existing ?? {
    service: createAttributeService(options),
    refs: 0,
    linger: null,
  };
  if (!existing) byDatalayer.set(options.datalayer, entry);
  if (entry.linger !== null) {
    clearTimeout(entry.linger);
    entry.linger = null;
  }
  entry.refs++;

  const pool = byDatalayer;
  let released = false;
  const release = () => {
    if (released) return; // double-release must not steal someone's ref
    released = true;
    entry.refs--;
    if (entry.refs > 0) return;
    entry.linger = setTimeout(() => {
      pool.delete(options.datalayer);
      entry.service.dispose();
    }, DISPOSE_LINGER_MS);
  };

  return { service: entry.service, release };
}
