/**
 * The one place a `SPARSE` colouring becomes a `Map<objectId, value>`.
 *
 * Between `useLabelColorLut` (which knows the entry) and `sparseSlice` (which
 * knows the format): fetches the dataset the entry names, picks the layout that
 * answers in one contiguous read, and hands the builder a reader it can call
 * without knowing any of it.
 *
 * The dataset query is cached per id for the app's life. It is metadata — the
 * layout paths, the chunking, the shape — and it is what lets the reader skip
 * the five `zarr.json` GETs the reference reader spends recovering the same
 * facts. One fetch per dataset, then every gene switch is chunk reads only.
 */
import {
  SparseColouringSourceDocument,
  type SparseColouringSourceFragment,
  type SparseColouringSourceQuery,
} from "@/mikro/api/graphql";
import type { MikroClient } from "@/core/data/zarr/store/types";
import { LruMap } from "@/core/util/lruMap";
import { openSparseLayout, pickLayout, readSparseSlice, sliceAsValues } from "./sparseSlice";

const sources = new LruMap<Promise<SparseColouringSourceFragment>>(16);

const fetchSource = (client: MikroClient, id: string): Promise<SparseColouringSourceFragment> => {
  const cached = sources.get(id);
  if (cached) return cached;
  if (!client.query) {
    return Promise.reject(new Error("this mikro client cannot run queries, so a sparse colouring cannot be read"));
  }
  const pending = client
    .query({ query: SparseColouringSourceDocument, variables: { id } })
    .then((result: { data?: SparseColouringSourceQuery }) => {
      const dataset = result.data?.sparseDataset;
      if (!dataset) throw new Error(`sparse dataset ${id} could not be read`);
      return dataset as SparseColouringSourceFragment;
    });
  sources.set(id, pending);
  pending.catch(() => {
    if (sources.get(id) === pending) sources.take(id);
  });
  return pending;
};

/**
 * Everything the label builder needs to answer a sparse colouring.
 *
 * `read` closes over the client and the datalayer so the builder never sees
 * either — it takes a source and a position and gets values back.
 */
/**
 * How a layer reads a sparse colouring.
 *
 * Here rather than beside either renderer: a label layer and a mesh layer ask
 * the same question of the same matrix, and the shape belongs to neither. It
 * used to live in `labelColorLut.ts`, which made the mesh builder import
 * sideways from `features/labels` — an edge the scene's architecture test
 * refuses, correctly.
 */
export type SparseReadRequest = {
  /** The dataset a `SPARSE` entry names, already fetched. */
  source: SparseColouringSourceFragment;
  /** Open the layout and read one slice, as `objectId -> value`. */
  read: (
    source: SparseColouringSourceFragment,
    at: readonly { axis: string; value: number }[],
  ) => Promise<{ values: Map<number, number>; slotCount: number }>;
};

export const loadSparseSource = async (client: MikroClient, datalayer: string, datasetId: string) => {
  const source = await fetchSource(client, datasetId);
  return {
    source,
    read: async (
      dataset: SparseColouringSourceFragment,
      at: readonly { axis: string; value: number }[],
    ): Promise<{ values: Map<number, number>; slotCount: number }> => {
      const choice = pickLayout(dataset, at);
      // The refusals `pickLayout` makes are the ones that would otherwise be a
      // scan of every byte, so they are errors rather than empty answers.
      if ("error" in choice) throw new Error(choice.error);

      const handle = await openSparseLayout(client, datalayer, choice);
      const indexedAxisName = dataset.axisNames[choice.indexedAxis];
      const position = at.find((entry) => entry.axis === indexedAxisName);
      if (!position) {
        throw new Error(
          `\`at\` names ${at.map((entry) => entry.axis).join(", ")}, none of which is '${indexedAxisName}' — the axis this layout selects along`,
        );
      }
      const run = await readSparseSlice(handle, position.value);
      return {
        values: sliceAsValues(handle, run, dataset, at),
        slotCount: handle.slotCount,
      };
    },
  };
};

/** One slice of a matrix, as both a colouring and a rule consume it. */
export type SparseSliceRead = {
  values: Map<number, number>;
  /** How many objects the matrix addresses — the slot space, zeros included. */
  slotCount: number;
};

/**
 * Reads one slice of ANY matrix, by dataset id — what every picker builder
 * takes for its RULES.
 *
 * A rule need not name the matrix the colouring does, so its source is
 * resolved at read time rather than fetched once by the caller. `null` (no
 * datalayer) means a sparse rule cannot be read at all, and the builders
 * report it as `skipped` rather than silently applying it to nothing.
 */
export type SparseReader = (
  datasetId: string,
  at: readonly { axis: string; value: number }[],
) => Promise<SparseSliceRead>;

/**
 * The reader the label, mesh and network LUT builders all inject.
 *
 * It was three byte-identical closures before, one per call site, each
 * re-deriving the same two facts: that the builder must stay free of Apollo
 * (so the fetch is injected, exactly as `readColumn` is on the column side),
 * and that `loadSparseSource`'s dataset query is cached per id for the app's
 * life — which is what makes "resolve per rule" cost one fetch per matrix
 * rather than one per rule.
 *
 * Lives beside `loadSparseSource` rather than in `scene/` because both the
 * scene's builders and anything else reading a sparse colouring want it, and
 * because from here it is subject to no layering rule at all.
 */
export const makeSparseReader = (
  client: MikroClient,
  datalayer: string | null | undefined,
): SparseReader | null =>
  datalayer
    ? async (datasetId, at) => {
        const source = await loadSparseSource(client, datalayer, datasetId);
        return source.read(source.source, at);
      }
    : null;
