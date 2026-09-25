import { Waypoints } from "lucide-react";
import { Button } from "@/core/components/ui/button";
import { useLayerVerdicts, useStartRegistration } from "../hooks/useRegistrationSession";

/**
 * No session yet: every layer, and what registering it would mean.
 *
 * A refusal is shown with its reason rather than hidden — "why can't I move
 * this one" is the question a user has, and the answers (the layer's own space
 * is the world; the edge is a fact about the data) are about their data model,
 * not about this tool.
 */
export const LayerPicker = (props: {
  /** Route an unregistered layer to the seed flow (the Register form). */
  onSeed?: (layerId: string) => void;
}) => {
  const verdicts = useLayerVerdicts();
  const start = useStartRegistration();

  if (!verdicts.length) {
    return <div className="p-4 text-center text-xs text-muted-foreground">This scene has no layers.</div>;
  }

  return (
    <div className="flex flex-col gap-2 p-3">
      <div className="text-xs text-muted-foreground">
        Pick the layer to align. It is drawn over the others while you move it; nothing is stored until you save.
      </div>
      {verdicts.map(({ layer, verdict }) => (
        <div key={layer.id} className="flex flex-col gap-1 rounded border border-border p-2">
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{layer.name}</div>
              <div className="text-[0.65rem] text-muted-foreground">{layer.typename.replace(/Layer$/, "")}</div>
            </div>
            {verdict.status === "editable" && (
              <Button type="button" size="sm" onClick={() => start(layer.id)}>
                <Waypoints /> Align
              </Button>
            )}
            {verdict.status === "unregistered" && props.onSeed && (
              <Button type="button" size="sm" variant="outline" onClick={() => props.onSeed?.(layer.id)}>
                <Waypoints /> Register…
              </Button>
            )}
          </div>
          {verdict.status === "unregistered" && (
            <div className="text-xs text-amber-500">
              Not placed in this scene yet. Register it first; it can then be aligned here.
            </div>
          )}
          {verdict.status === "refused" && <div className="text-xs text-muted-foreground">{verdict.reason}</div>}
        </div>
      ))}
    </div>
  );
};
