import { useCallback, useRef } from "react";
import { toast } from "sonner";
import {
  AnnotationKind,
  AxisType,
  CreatableTransformKind,
  DerivationSourceKind,
  useCreateAnnotationLayerMutation,
  useCreateExperimentAnnotationCollectionMutation,
  useCreateExperimentAnnotationMutation,
  type CreateAnnotationInput,
} from "@/elektro/api/graphql";
import { appendAnnotation, appendLayer, defaultCollectionId, optimisticAnnotation } from "./annotationCache";
import { useExperimentStoreApi } from "../../platform/stores/experimentStore";
import { bandKey, effectiveClim, useViewerStoreApi } from "../../platform/stores/viewerStore";
import type { Commit } from "./annotationTools";
import {
  findValueCollection,
  lensChannelOf,
  lensSpaceOf,
  rowVectors,
  valueCollectionInput,
  worldVertex,
  type CollectionLike,
} from "./valueCollections";
import type { CoordinateSystemLike } from "../../platform/coords/timeAxis";

/**
 * Turning a finished gesture into an annotation on the server.
 *
 *  - A TIME shape (event, events, epoch) goes to the experiment's own collection
 *    (`createAnnotation(experiment:)`), in world coordinates.
 *  - A ROW shape (line, path, polygon) goes to the value collection drawn over
 *    the trace's lens (`valueCollections.ts`), minted with its annotation layer on
 *    the first shape drawn over that lens. Mints are single-flight per lens space,
 *    so two quick shapes cannot mint two collections.
 *
 * Writes go straight into the Apollo cache (`annotationCache.ts`) rather than
 * refetching the scene. An annotation is appended to its collection OPTIMISTICALLY,
 * so it is on screen before the server answers, and a minted layer is appended to
 * the experiment. Only the experiment's very first time mark refetches: the
 * server mints its default collection and layer there, and the client has no
 * other way to learn of them. A new collection or layer arrives as a reconcile,
 * never a rebuild, so the canvas survives it.
 */

type Minted = { id: string; coordinateSystem: CoordinateSystemLike | null };

const KIND: Record<Commit["tool"], AnnotationKind> = {
  EVENT: AnnotationKind.Event,
  EVENTS: AnnotationKind.Events,
  EPOCH: AnnotationKind.Epoch,
  LINE: AnnotationKind.Line,
  PATH: AnnotationKind.Path,
  POLYGON: AnnotationKind.Polygon,
};

const AXIS_TYPE = { TIME: AxisType.Time, CHANNEL: AxisType.Channel, VALUE: AxisType.Value };

const messageOf = (error: unknown) => (error instanceof Error ? error.message : String(error));

export const useAnnotationCommit = () => {
  const experimentApi = useExperimentStoreApi();
  const viewerApi = useViewerStoreApi();
  const [createAnnotation, { client }] = useCreateExperimentAnnotationMutation();
  const [createCollection] = useCreateExperimentAnnotationCollectionMutation();
  const [createLayer] = useCreateAnnotationLayerMutation();
  const minting = useRef(new Map<string, Promise<Minted>>());

  /**
   * One annotation. Into a collection the cache knows: optimistic, appended in
   * place. Otherwise (the experiment's first mark): plain, and refetch the scene
   * to learn of the collection and layer the server minted for it.
   */
  const writeAnnotation = useCallback(
    (input: CreateAnnotationInput, collectionId: string | null) =>
      collectionId
        ? createAnnotation({
            variables: { input },
            optimisticResponse: optimisticAnnotation(input, collectionId),
            update: (cache, { data }) => {
              appendAnnotation(cache, data?.createAnnotation);
            },
          })
        : createAnnotation({ variables: { input }, refetchQueries: ["GetExperimentScene"] }),
    [createAnnotation],
  );

  /** The value collection over a trace's lens — found, or minted with its layer. */
  const valueCollectionFor = useCallback(
    async (traceLayerId: string): Promise<Minted> => {
      const { rawLayers, experimentId, layerIndex } = experimentApi.getState();
      const raw = rawLayers[traceLayerId];
      if (raw?.__typename !== "TraceLayer") throw new Error("That row is not a trace.");
      const spaceId = lensSpaceOf(raw.lens)?.id ?? raw.lens.id;
      const found = findValueCollection(rawLayers as never, raw.lens);
      if (found) {
        // The fold has it now; a later deletion must be able to mint again.
        minting.current.delete(spaceId);
        return found.collection as CollectionLike & Minted;
      }

      const pending = minting.current.get(spaceId);
      if (pending) return pending;

      const layer = layerIndex.get(traceLayerId);
      const input = valueCollectionInput({
        lens: raw.lens,
        layerLabel: layer?.label ?? raw.name ?? "Trace",
        valueUnit: layer?.valueUnit,
      });
      if (!input) throw new Error("This trace's lens has no time axis to draw along.");

      const mint = (async (): Promise<Minted> => {
        const { data } = await createCollection({
          variables: {
            input: {
              name: input.name,
              description: input.description,
              axes: input.axes.map((a) => ({ name: a.name, longName: a.longName, type: AXIS_TYPE[a.type] })),
              derivedFrom: input.derivedFrom.map((d) => ({
                kind: DerivationSourceKind.Lens,
                lens: d.lens,
                transform: {
                  kind: CreatableTransformKind.ByDimension,
                  inputAxes: d.transform.inputAxes,
                  outputAxes: d.transform.outputAxes,
                  scale: d.transform.scale,
                },
              })),
            },
          },
        });
        const collection = data?.createAnnotationCollection;
        if (!collection) throw new Error("The server returned no collection.");
        try {
          await createLayer({
            variables: {
              input: { experiment: experimentId, annotationCollection: collection.id, name: input.name },
            },
            update: (cache, { data: created }) => {
              appendLayer(cache, experimentId, created?.createAnnotationLayer);
            },
          });
        } catch (error) {
          // The layer may exist even so (a placement that errors, say): let
          // the scene say what the server holds.
          void client.refetchQueries({ include: ["GetExperimentScene"] });
          throw error;
        }
        return { id: collection.id, coordinateSystem: collection.coordinateSystem };
      })();
      minting.current.set(spaceId, mint);
      // A failed mint must be retryable; a successful one is found by the next
      // fold, and until then this promise answers.
      mint.catch(() => minting.current.delete(spaceId));
      return mint;
    },
    [experimentApi, createCollection, createLayer, client],
  );

  const commitRow = useCallback(
    async (commit: Commit) => {
      const row = commit.row;
      if (!row) return;
      // Read the row's scale NOW, the one the shape was drawn against.
      const viewer = viewerApi.getState();
      const band = viewer.bands[bandKey(row.layerId, row.channel)];
      const clim = band ? effectiveClim(viewer.clims, band) : null;
      const { rawLayers, layerIndex } = experimentApi.getState();
      const timeMap = layerIndex.get(row.layerId)?.source?.timeMap;
      const raw = rawLayers[row.layerId];
      if (!band || !clim || !timeMap || raw?.__typename !== "TraceLayer") {
        throw new Error("That row has no scale yet — wait for its data to load.");
      }
      const collection = await valueCollectionFor(row.layerId);
      const encoded = rowVectors({
        points: commit.points,
        system: collection.coordinateSystem,
        timeMap,
        band,
        clim,
        lensChannel: lensChannelOf(raw.channelIndex, row.channel),
      });
      if (!encoded) throw new Error("The collection has no time and value axes.");
      await writeAnnotation(
        {
          collection: collection.id,
          kind: KIND[commit.tool],
          vectors: encoded.vectors,
          coordinates: encoded.coordinates,
        },
        collection.id,
      );
    },
    [experimentApi, viewerApi, valueCollectionFor, writeAnnotation],
  );

  const commitTime = useCallback(
    async (commit: Commit) => {
      const { world, experimentId } = experimentApi.getState();
      let times = commit.points.map((p) => p.time);
      if (commit.tool === "EPOCH") times = [Math.min(...times), Math.max(...times)];
      if (commit.tool === "EPOCH" && times[1] <= times[0]) return;
      await writeAnnotation(
        {
          experiment: experimentId,
          kind: KIND[commit.tool],
          vectors: times.map((t) => worldVertex(world, t)),
        },
        defaultCollectionId(client.cache, experimentId),
      );
    },
    [experimentApi, writeAnnotation, client],
  );

  return useCallback(
    (commit: Commit) => {
      const write = commit.row ? commitRow(commit) : commitTime(commit);
      void write.catch((error: unknown) =>
        toast.error(`Could not save the ${commit.tool.toLowerCase()}: ${messageOf(error)}`),
      );
    },
    [commitRow, commitTime],
  );
};
