import { useCallback } from "react";
import { toast } from "@/core/notify";
import { AnnotationKind, useCreateAnnotationMutation } from "@/mikro/api/graphql";
import { upsertSceneAnnotation } from "@/mikro/lib/annotations/annotationCache";
import type { ChartLayerState } from "../../platform/model/chartLayerModel";
import { isDrawingSurface, vectorOf, type MarkPoint } from "../../platform/model/chartMarks";
import { chartToolSpec, type ChartTool } from "./chartTools";

/**
 * Write a drawn shape into its layer's collection.
 *
 * Each vertex is mapped back into the collection's OWN space — the position
 * through the layer's placement, the height on its VALUE axis — one component
 * per axis of that space, in its order. The answer IS the new mark: it is
 * written into the collection's list instead of fetching the list again
 * (`annotationCache`), and a live layer hearing its own draw back is a no-op.
 */
export const useChartAnnotationCommit = () => {
  const [createAnnotation] = useCreateAnnotationMutation();

  return useCallback(
    async (layer: ChartLayerState, tool: ChartTool, points: readonly MarkPoint[]): Promise<boolean> => {
      const marks = layer.marks;
      const space = marks?.space ?? null;
      if (!marks || !isDrawingSurface(space)) return false;
      try {
        await createAnnotation({
          variables: {
            input: {
              collection: marks.collectionId,
              kind: chartToolSpec(tool).kind as AnnotationKind,
              vectors: points.map((point) => vectorOf(point, space, marks.axisCount)),
            },
          },
          update: (cache, { data }) => {
            const drawn = data?.createAnnotation;
            if (drawn) upsertSceneAnnotation(cache, marks.collectionId, drawn);
          },
        });
        return true;
      } catch (error) {
        toast.error(`Could not save the mark: ${error instanceof Error ? error.message : String(error)}`);
        return false;
      }
    },
    [createAnnotation],
  );
};
