import { Trash2 } from "lucide-react";
import { toast } from "@/core/notify";
import { Button } from "@/core/ui/button";
import {
  useDeleteAnnotationMutation,
  useGetSceneAnnotationsQuery,
} from "@/mikro/api/graphql";
import {
  removeSceneAnnotation,
  sceneAnnotationsVariables,
} from "@/mikro/lib/annotations/annotationCache";
import { useChartLayer } from "../../platform/stores/chartStore";
import { useAnnotationLayerIds } from "./useAnnotationLayers";

/**
 * Every mark drawn in the chart, by layer, with the one thing a list can do to
 * a mark: remove it. Reads the same per-collection list the overlay draws, so
 * the two cannot disagree.
 *
 * A layer with no marks is not listed (nothing to show renders nothing).
 */
export const ChartAnnotationsPanel = () => {
  const layerIds = useAnnotationLayerIds({ visibleOnly: false });
  return (
    <div className="flex flex-col gap-3 overflow-y-auto p-3">
      {layerIds.map((id) => (
        <LayerMarkList key={id} layerId={id} />
      ))}
      {layerIds.length === 0 && (
        <p className="text-xs text-muted-foreground">
          This chart has no annotation layer. Switch to Annotate to add a drawing layer.
        </p>
      )}
    </div>
  );
};

const LayerMarkList = ({ layerId }: { layerId: string }) => {
  const layer = useChartLayer(layerId);
  const collectionId = layer?.marks?.collectionId;
  const { data } = useGetSceneAnnotationsQuery({
    variables: sceneAnnotationsVariables(collectionId ?? ""),
    skip: !collectionId,
    fetchPolicy: "cache-and-network",
  });
  const [remove] = useDeleteAnnotationMutation();
  const annotations = data?.annotations ?? [];
  if (!layer || annotations.length === 0) return null;

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2 pb-1">
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: layer.color }} />
        <span className="truncate text-xs font-medium">{layer.label}</span>
        <span className="ml-auto font-mono text-[10px] text-muted-foreground">{annotations.length}</span>
      </div>
      {annotations.map((annotation) => (
        <div
          key={annotation.id}
          className="group/mark flex items-center gap-2 border-t border-border/40 py-1 text-[11px]"
        >
          <span className="font-mono text-muted-foreground">{annotation.kind.toLowerCase().replace("_", " ")}</span>
          <span className="truncate">{annotation.name}</span>
          <Button
            size="icon-xs"
            variant="ghost"
            className="ml-auto opacity-0 group-hover/mark:opacity-100"
            title="Delete this mark"
            onClick={() =>
              void remove({
                variables: { input: { id: annotation.id } },
                // The answer is the id that went: drop it from the list here.
                update: (cache) => removeSceneAnnotation(cache, annotation.id),
              }).catch((error: unknown) =>
                toast.error(
                  `Could not delete the mark: ${error instanceof Error ? error.message : String(error)}`,
                ),
              )
            }
          >
            <Trash2 />
          </Button>
        </div>
      ))}
    </div>
  );
};
