import { useCallback } from "react";
import { reportError } from "@/core/notify";
import {
  AnnotationKind,
  useCreateAnnotationMutation,
  useCreateSceneAnnotationMutation,
  type CreateAnnotationMutation,
} from "@/mikro/api/graphql";
import { spatialAxisTriple } from "@/core/data/scene/coords/transformGraph";
import { upsertSceneAnnotation } from "../../../../lib/annotations/annotationCache";
import { inSceneOrder, toStoredVector } from "./sceneVectors";
import { useRoiSelectionStoreApi } from "./roiSelectionStore";
import { useSceneStoreApi } from "../../platform/stores/sceneStore";
import { useViewerStoreApi } from "../../platform/stores/viewerStore";
import { layerLensPartner, pairLayerId } from "./hover/annotationActionTarget";
import { primeCardDescriptors } from "./hover/primeCardDescriptors";

export type CreatedSceneAnnotation = CreateAnnotationMutation["createAnnotation"];

/**
 * The one path that persists an annotation into the scene, shared by the
 * shape drawer (`RoiDrawer`), the probe's shift+click save (brick layers) and
 * the probe panel. Vectors are scene WORLD coordinates — the scene's
 * annotation collection is registered into the world by identity, so there is
 * no world→voxel inversion. They are taken and answered as `[x, y, z]` and
 * sent in the collection's axis order, one component per spatial axis of the
 * world (`sceneVectors.ts`).
 *
 * A confirmed annotation is auto-selected (single selection), so the selected
 * ROI panel starts its attribute lookups the moment the server answers.
 *
 * This hook is mounted by the hot brick layer components, which otherwise
 * avoid reactive store subscriptions — so it must not subscribe either. All
 * scene state is read lazily via the store API at call time.
 *
 * With a lens under the probe, the draw also asks what the shape's card will
 * (`CreateSceneAnnotation`: its descriptors, and its crop's of that lens) and
 * writes the answer where the card reads it, so the card that opens on the new
 * shape lists its actions without a request of its own.
 */
export const useCreateSceneAnnotation = () => {
  const sceneStoreApi = useSceneStoreApi();
  const roiSelectionApi = useRoiSelectionStoreApi();
  const viewerStoreApi = useViewerStoreApi();
  const [createAnnotation] = useCreateAnnotationMutation();
  const [createWithCut] = useCreateSceneAnnotationMutation();

  const createSceneAnnotation = useCallback(
    async (
      kind: AnnotationKind,
      worldVectors: [number, number, number][],
    ): Promise<CreatedSceneAnnotation | null> => {
      try {
        const { id: sceneId, transformContext } = sceneStoreApi.getState();
        // The drawing space copies the world's axes, so the world says how
        // many components a vertex has: two on a plane, three in a volume.
        const spaceRank = spatialAxisTriple(transformContext.worldCoordinateSystem).filter(
          (axis) => axis !== null,
        ).length;
        const vectors = worldVectors.map((vector) => toStoredVector(vector, spaceRank || 3));
        const drawsCollection = (collectionId: string | undefined) =>
          sceneStoreApi
            .getState()
            .sceneLayers.some(
              (layer) =>
                layer.__typename === "AnnotationLayer" &&
                layer.annotationCollection?.id === collectionId,
            );
        // The lens the card will run with: the probe's, by the card's own rule.
        const layers = sceneStoreApi.getState().layers;
        const lens = layerLensPartner(
          pairLayerId(null, viewerStoreApi.getState().probeLayerId, layers),
          layers,
        );
        const input = { scene: sceneId, kind, vectors };
        const options = {
          // Annotating the scene mints its annotation collection, the
          // collection's registration into the world AND the AnnotationLayer
          // that draws it — but only on first use. Until that layer exists
          // there is nothing to render the shape, so the first annotation has
          // to refetch the scene itself, once.
          refetchQueries: ({ data }: { data?: CreateAnnotationMutation | null }) =>
            drawsCollection(data?.createAnnotation.collection.id) ? [] : ["GetScene"],
          awaitRefetchQueries: false,
        };
        const result = lens
          ? await createWithCut({
              variables: { input, lens: lens.id },
              update: (cache, { data }) => {
                const drawn = data?.createAnnotation;
                if (!drawn) return;
                upsertSceneAnnotation(cache, drawn.collection.id, drawn);
                primeCardDescriptors(cache, drawn, lens.id);
              },
              ...options,
            })
          : await createAnnotation({
              variables: { input },
              // The answer IS the new shape: write it into its collection's list
              // instead of fetching the whole list again (`annotationCache.ts`).
              // In stored order, as the cache holds every shape.
              update: (cache, { data }) => {
                const drawn = data?.createAnnotation;
                if (drawn) upsertSceneAnnotation(cache, drawn.collection.id, drawn);
              },
              ...options,
            });
        const answered = result.data?.createAnnotation ?? null;
        if (!answered) return null;
        const created = inSceneOrder(answered);

        // Auto-select the confirmed annotation. On the very first annotation
        // the AnnotationLayer does not exist yet (GetScene refetch in flight)
        // — layerId stays "" here, and the layer REPAIRS the entry when it
        // mounts (`features/annotations/selectionRepair.ts`). That repair is not cosmetic:
        // the info panel resolves the collection matrix by layerId, so an
        // unrepaired "" leaves it with no anchor and parks it in the corner.
        // The highlight itself matches by annotation id and lands either way,
        // and attribute lookups only need the system and vectors below.
        const annotationLayer = sceneStoreApi
          .getState()
          .sceneLayers.find(
            (layer) =>
              layer.__typename === "AnnotationLayer" &&
              layer.annotationCollection?.id === created.collection.id,
          );
        const system =
          created.coordinateSystem ??
          (annotationLayer?.__typename === "AnnotationLayer"
            ? annotationLayer.annotationCollection?.coordinateSystem
            : null) ??
          null;
        const roi = {
          id: created.id,
          layerId: annotationLayer?.id ?? "",
          name: created.name,
          kind: created.kind,
          systemId: system?.id ?? null,
          axisNames: (system?.axes ?? []).map((axis) => axis.name),
          vectors: created.vectors ?? [],
          coordinates: created.coordinates ?? [],
        };
        roiSelectionApi.getState().selectOnlyRoi(roi);
        // A shape just drawn is the one to act on: open its card, as a click
        // on it would (`hover/AnnotationHoverCard`), at its box corner.
        // Not for a point: placing points is a run of clicks, and a menu
        // after each would sit in the way of the next.
        if (kind !== AnnotationKind.Point) roiSelectionApi.getState().openRoiMenu(roi);
        return created;
      } catch (err) {
        // The drawn shape is gone with the failed write: say why.
        reportError(err, { title: "Couldn't save the annotation", id: "create-scene-annotation" });
        return null;
      }
    },
    [createAnnotation, createWithCut, sceneStoreApi, viewerStoreApi, roiSelectionApi],
  );

  const createPointAnnotation = useCallback(
    (worldPos: [number, number, number]) =>
      createSceneAnnotation(AnnotationKind.Point, [worldPos]),
    [createSceneAnnotation],
  );

  return { createSceneAnnotation, createPointAnnotation };
};
