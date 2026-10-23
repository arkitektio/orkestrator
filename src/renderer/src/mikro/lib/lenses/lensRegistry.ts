import type { MikroClient } from "@/core/data/zarr/store/types";
import {
  EnsureAnnotationLensDocument,
  EnsureArrayLensDocument,
  EnsureFixtureLensDocument,
  EnsureMeshLensDocument,
  EnsureNetworkLensDocument,
  EnsureSparseLensDocument,
  EnsureTableLensDocument,
  GetLensSelectionsDocument,
  type GetLensSelectionsQuery,
  type LensSelectionFragment,
} from "@/mikro/api/graphql";
import type { LensContainerRef } from "@/mikro/lenses";
import {
  arraySelectionKey,
  atOfWindows,
  channelSlices,
  positionWindows,
  sparseSelectionKey,
  type AxisPosition,
  type LensSelection,
  type SliceLike,
} from "./lensSelection";

/**
 * The session's answer to two questions about lenses, in both directions:
 *
 *   id → selection   a render-graph node or a sparse colouring names a lens by
 *                    a bare id; drawing it needs the channel index or the
 *                    matrix position that lens stands for.
 *   selection → id   an editor picks channel 2 or gene 4711; saving it needs
 *                    the id of the lens that selects exactly that.
 *
 * Both are safe to keep for the session: a lens is one row per (container,
 * selection) and neither it nor its container changes. A lens can be DELETED,
 * which leaves the first direction true and may stale the second — `forget`
 * drops an id, and the create mutations behind `ensure*` are idempotent, so the
 * next ask simply finds or makes the lens again.
 *
 * THE SEAM. Everything the scene knows about a lens it was handed only an id
 * for comes through `peek`. Today the gaps are filled by one batched
 * `lenses(filters: { ids })` round trip (`resolveMany`); a backend field that
 * hands those lenses back inline would `seed` them from the payload instead and
 * that round trip disappears, with nothing downstream changing.
 *
 * Imperative on purpose (`client.query` / `client.mutate`, the
 * `lib/zarr/access.ts` pattern): no hook mounts here, so the mikro guard stays
 * with the calling host (CLAUDE.md §1).
 */
export type LensRegistry = {
  /** The selection of a lens already seen, or undefined. Synchronous. */
  peek(id: string): LensSelection | undefined;
  /** Record a lens the caller already holds (a payload's, a mutation's). */
  seed(lens: LensSelectionFragment | LensSelection | null | undefined): void;
  /** The ids of `ids` nothing is known about yet, deduplicated. */
  missing(ids: Iterable<string | null | undefined>): string[];
  /** Resolve every unknown id of `ids` in ONE request. Never rejects. */
  resolveMany(ids: Iterable<string | null | undefined>): Promise<void>;
  /** The lens over `datasetId` making exactly this selection. */
  ensureArrayLens(datasetId: string, slices: readonly SliceLike[]): Promise<string>;
  /** `base` with `axis` at one dataset index: one channel of a selection. */
  ensureChannelLens(
    datasetId: string,
    base: readonly SliceLike[] | null | undefined,
    axis: string,
    index: number,
  ): Promise<string>;
  /** The sparse lens pinning one position of a matrix. */
  ensureSparseLens(sparseDatasetId: string, at: readonly AxisPosition[]): Promise<string>;
  /** A container's whole lens, when the caller does not already hold its id. */
  ensureWholeLens(container: LensContainerRef): Promise<string>;
  /** Drop a lens id that turned out to be gone, so the next ask re-creates it. */
  forget(id: string): void;
};

/** A lens as the wire spells it, reduced to what it selects. */
export function toLensSelection(lens: LensSelectionFragment): LensSelection {
  if (lens.__typename === "ArrayLens") {
    return { kind: "array", id: lens.id, dataset: lens.dataset.id, slices: lens.slices };
  }
  if (lens.__typename === "SparseLens") {
    return {
      kind: "sparse",
      id: lens.id,
      dataset: lens.sparseDataset.id,
      at: atOfWindows(lens.windows),
    };
  }
  return { kind: "other", id: lens.id };
}

const isSelection = (lens: LensSelectionFragment | LensSelection): lens is LensSelection =>
  "kind" in lens;

const WHOLE_LENS_MUTATIONS = {
  dataset: { document: EnsureArrayLensDocument, field: "createLens" },
  tableDataset: { document: EnsureTableLensDocument, field: "createTableLens" },
  sparseDataset: { document: EnsureSparseLensDocument, field: "createSparseLens" },
  meshCollection: { document: EnsureMeshLensDocument, field: "createMeshLens" },
  networkCollection: { document: EnsureNetworkLensDocument, field: "createNetworkLens" },
  annotationCollection: {
    document: EnsureAnnotationLensDocument,
    field: "createAnnotationLens",
  },
  fixture: { document: EnsureFixtureLensDocument, field: "createFixtureLens" },
} as const;

function createLensRegistry(client: MikroClient): LensRegistry {
  const byId = new Map<string, LensSelection>();
  // The stored promise is the cache AND the single-flight: two Saves asking for
  // the same channel share one mutation. A rejection evicts its key.
  const idBySelection = new Map<string, Promise<string>>();
  const resolving = new Map<string, Promise<void>>();

  const record = (selection: LensSelection) => {
    byId.set(selection.id, selection);
    if (selection.kind === "array") {
      idBySelection.set(
        arraySelectionKey(selection.dataset, selection.slices),
        Promise.resolve(selection.id),
      );
    } else if (selection.kind === "sparse" && selection.at) {
      idBySelection.set(
        sparseSelectionKey(selection.dataset, selection.at),
        Promise.resolve(selection.id),
      );
    }
  };

  const seed: LensRegistry["seed"] = (lens) => {
    if (!lens) return;
    record(isSelection(lens) ? lens : toLensSelection(lens));
  };

  const missing: LensRegistry["missing"] = (ids) => {
    const unknown = new Set<string>();
    for (const id of ids) if (id && !byId.has(id)) unknown.add(id);
    return [...unknown];
  };

  const ensure = (
    key: string,
    document: unknown,
    field: string,
    input: Record<string, unknown>,
  ): Promise<string> => {
    const cached = idBySelection.get(key);
    if (cached) return cached;
    const pending = client
      .mutate({ mutation: document, variables: { input } })
      .then((result) => {
        const lens = result.data?.[field] as LensSelectionFragment | undefined;
        if (!lens?.id) throw new Error("The server returned no lens for this selection");
        seed(lens);
        return lens.id;
      });
    idBySelection.set(key, pending);
    pending.catch(() => {
      if (idBySelection.get(key) === pending) idBySelection.delete(key);
    });
    return pending;
  };

  const ensureArrayLens: LensRegistry["ensureArrayLens"] = (datasetId, slices) =>
    ensure(arraySelectionKey(datasetId, slices), EnsureArrayLensDocument, "createLens", {
      dataset: datasetId,
      slices: slices.map((slice) => ({
        axis: slice.axis,
        start: slice.start ?? null,
        stop: slice.stop ?? null,
        step: slice.step ?? null,
      })),
    });

  return {
    peek: (id) => byId.get(id),
    seed,
    missing,
    resolveMany: (ids) => {
      const wanted = missing(ids);
      const fresh = wanted.filter((id) => !resolving.has(id));
      if (fresh.length > 0) {
        const request = (
          client.query
            ? client.query({
                query: GetLensSelectionsDocument,
                variables: { ids: fresh, limit: fresh.length },
                // The LIST is an answer to these ids only; writing it would add
                // one `lenses` cache entry per distinct id set for nothing.
                fetchPolicy: "no-cache",
              })
            : Promise.reject(new Error("This client cannot query"))
        )
          .then((result) => {
            const data = result.data as GetLensSelectionsQuery | null | undefined;
            for (const lens of data?.lenses ?? []) seed(lens);
          })
          // A failed lookup must not take the scene with it: the layers that
          // wanted these ids draw with their fallback and the next reconcile
          // asks again.
          .catch((error) => {
            console.warn("[lenses] could not resolve lens selections", error);
          })
          .finally(() => {
            for (const id of fresh) resolving.delete(id);
          });
        for (const id of fresh) resolving.set(id, request);
      }
      const waits = new Set<Promise<void>>();
      for (const id of wanted) {
        const wait = resolving.get(id);
        if (wait) waits.add(wait);
      }
      return Promise.all(waits).then(() => undefined);
    },
    ensureArrayLens,
    ensureChannelLens: (datasetId, base, axis, index) =>
      ensureArrayLens(datasetId, channelSlices(base, axis, index)),
    ensureSparseLens: (sparseDatasetId, at) =>
      ensure(
        sparseSelectionKey(sparseDatasetId, at),
        EnsureSparseLensDocument,
        "createSparseLens",
        { sparseDataset: sparseDatasetId, windows: positionWindows(at) },
      ),
    ensureWholeLens: (container) => {
      const entry = (Object.keys(WHOLE_LENS_MUTATIONS) as (keyof typeof WHOLE_LENS_MUTATIONS)[])
        .map((key) => [key, container[key]] as const)
        .find(([, id]) => id != null);
      if (!entry) return Promise.reject(new Error("No container was named for the lens"));
      const [key, id] = entry;
      const { document, field } = WHOLE_LENS_MUTATIONS[key];
      return ensure(`w|${key}|${id}`, document, field, { [key]: id });
    },
    forget: (id) => {
      byId.delete(id);
      // The reverse entries are promises; drop every one that settled on this
      // id rather than tracking a second index for a rare event.
      for (const [key, pending] of idBySelection) {
        void pending.then(
          (resolved) => {
            if (resolved === id && idBySelection.get(key) === pending) idBySelection.delete(key);
          },
          () => undefined,
        );
      }
    },
  };
}

const registries = new WeakMap<object, LensRegistry>();

/** The registry of one mikro client: one per service connection, per session. */
export function lensRegistry(client: MikroClient): LensRegistry {
  let registry = registries.get(client);
  if (!registry) {
    registry = createLensRegistry(client);
    registries.set(client, registry);
  }
  return registry;
}
