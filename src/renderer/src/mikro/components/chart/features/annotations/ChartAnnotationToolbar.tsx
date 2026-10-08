import { Plus } from "lucide-react";
import { toast } from "@/core/notify";
import { useViewerStore } from "@/core/data/plot/stores/viewerStore";
import { Button } from "@/core/ui/button";
import { ButtonGroup } from "@/core/ui/button-group";
import { useCreateAnnotationChartLayerMutation } from "@/mikro/api/graphql";
import { useChartStore } from "../../platform/stores/chartStore";
import { CHART_TOOLS, chartToolSpec } from "./chartTools";
import { useChartAnnotationStore, useChartAnnotationStoreApi } from "./store/annotationSlice";
import { useDrawingTargetId } from "./useAnnotationLayers";

/**
 * The drawing tools, shown while annotating. With no drawing layer in the
 * chart there is nothing to draw on, and the bar offers to add one instead —
 * explicitly: a layer is never made behind a first stroke.
 */
export const ChartAnnotationToolbar = () => {
  const mode = useViewerStore((s) => s.interactionMode);
  const tool = useChartAnnotationStore((s) => s.annotateTool);
  const toolApi = useChartAnnotationStoreApi();
  const targetId = useDrawingTargetId();
  const chartId = useChartStore((s) => s.chartId);
  const [addLayer, { loading }] = useCreateAnnotationChartLayerMutation({ refetchQueries: ["GetChart"] });

  if (mode !== "ANNOTATE") return null;

  return (
    <div className="pointer-events-auto absolute left-1/2 top-2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-lg border border-black/10 bg-black/40 p-1 backdrop-blur-md">
      {targetId ? (
        <>
          <ButtonGroup>
            {CHART_TOOLS.map((spec) => (
              <Button
                key={spec.tool}
                size="xs"
                variant={tool === spec.tool ? "default" : "outline"}
                className={tool === spec.tool ? "h-7" : "h-7 bg-black"}
                title={`${spec.hint} (${spec.shortcut.toUpperCase()})`}
                aria-pressed={tool === spec.tool}
                onClick={() => toolApi.getState().setAnnotateTool(spec.tool)}
              >
                {spec.label}
              </Button>
            ))}
          </ButtonGroup>
          <span className="pr-1 text-[11px] text-muted-foreground">{chartToolSpec(tool).hint}</span>
        </>
      ) : (
        <Button
          size="xs"
          variant="outline"
          className="h-7 bg-black"
          disabled={loading}
          title="An empty surface over this chart, to draw marks on"
          onClick={() =>
            void addLayer({ variables: { input: { chart: chartId } } }).catch((error: unknown) =>
              toast.error(
                `Could not add a drawing layer: ${error instanceof Error ? error.message : String(error)}`,
              ),
            )
          }
        >
          <Plus className="h-3.5 w-3.5" /> Add drawing layer
        </Button>
      )}
    </div>
  );
};
