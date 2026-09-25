import { Crosshair, Trash2, Wand2 } from "lucide-react";
import { useMemo } from "react";
import { toast } from "sonner";
import { Button } from "@/core/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/core/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/core/ui/toggle-group";
import { useSceneDisplayMode, useSceneHostLayers, useSceneWorld } from "../../scene/sceneHost";
import { landmarkResiduals } from "../math/residuals";
import { fitLandmarks, minimumPairs } from "../math/solvers";
import { useRegistration, useRegistrationApi } from "../store/context";
import { completePairs, type PickSide } from "../store/registrationStore";

const format = (value: number): string => (value >= 100 ? value.toFixed(0) : value.toPrecision(3));

/**
 * Landmark pairs: click the same feature on the fixed layer and on the moving
 * layer, then fit.
 *
 * The fit and the gizmo edit the SAME draft, so they compose in either order:
 * rough it in by hand and let the landmarks finish it, or fit first and nudge.
 * The residual column is always the distance under the CURRENT draft, which
 * also makes landmarks a way to CHECK a hand alignment without fitting at all.
 */
export const LandmarkPanel = () => {
  const api = useRegistrationApi();
  const session = useRegistration((state) => state.session);
  const landmarks = useRegistration((state) => state.landmarks);
  const pickSide = useRegistration((state) => state.pickSide);
  const pickBlocked = useRegistration((state) => state.pickBlocked);
  const fixedLayerId = useRegistration((state) => state.fixedLayerId);
  const constraint = useRegistration((state) => state.constraint);
  // Pre-drag while a gesture is in flight: the table does not need pointer-rate updates.
  const delta = useRegistration((state) => state.gestureStart ?? state.delta);
  const layers = useSceneHostLayers();
  const world = useSceneWorld();
  const planar = useSceneDisplayMode() === "2D";

  const residuals = useMemo(() => landmarkResiduals(landmarks, delta), [landmarks, delta]);
  const pairs = useMemo(() => completePairs(landmarks), [landmarks]);
  if (!session) return null;

  const editable = session.phase === "editing";
  const members = new Set(session.memberLayerIds);
  const fixedCandidates = layers.filter((layer) => !members.has(layer.id) && layer.placeable);
  const needed = minimumPairs(constraint, planar);
  const unit = world.unit === "px" ? "px" : world.unit;

  const fit = () => {
    const result = fitLandmarks(pairs, constraint, { planar });
    if (!result.ok) {
      toast.error(result.reason);
      return;
    }
    // The moving halves are in base world, so the fit IS the new draft — it
    // replaces whatever was there, as one undoable step.
    api.getState().replaceDelta(result.matrix);
    api.getState().setPickSide(null);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="w-14 shrink-0 text-xs text-muted-foreground">Fixed</span>
        <Select value={fixedLayerId ?? undefined} onValueChange={(value) => api.getState().setFixedLayerId(value)}>
          <SelectTrigger className="h-6 min-w-0 flex-1 text-xs">
            <SelectValue placeholder="Pick a reference layer" />
          </SelectTrigger>
          <SelectContent>
            {fixedCandidates.map((layer) => (
              <SelectItem key={layer.id} value={layer.id} className="text-xs">
                {layer.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <span className="w-14 shrink-0 text-xs text-muted-foreground">Click on</span>
        <ToggleGroup
          type="single"
          size="sm"
          variant="outline"
          value={pickSide ?? ""}
          disabled={!editable}
          onValueChange={(value) => api.getState().setPickSide((value || null) as PickSide | null)}
          className="justify-start"
        >
          <ToggleGroupItem value="fixed" className="text-xs" disabled={!fixedLayerId}>
            <Crosshair className="text-cyan-400" /> fixed
          </ToggleGroupItem>
          <ToggleGroupItem value="moving" className="text-xs">
            <Crosshair className="text-amber-400" /> moving
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {pickSide && !pickBlocked && (
        <div className="text-[0.65rem] text-muted-foreground">
          Click the {pickSide} layer. Only that layer answers, even where the other covers it; the side alternates
          after each click. Drag with the right button to move the view. Esc stops.
        </div>
      )}
      {pickSide && pickBlocked && (
        <div className="text-[0.65rem] text-amber-500">
          This scene cannot pick points here: picking rides the probe, which needs an image or label layer.
        </div>
      )}

      {landmarks.length > 0 && (
        <div className="flex flex-col rounded border border-border text-xs">
          {landmarks.map((landmark, index) => {
            const residual = residuals.byId.get(landmark.id);
            return (
              <div
                key={landmark.id}
                className="flex items-center gap-2 border-b border-border px-2 py-1 last:border-b-0 hover:bg-accent/50"
                onMouseEnter={() => api.getState().setHighlightedLandmark(landmark.id)}
                onMouseLeave={() => api.getState().setHighlightedLandmark(null)}
              >
                <span className="w-4 text-muted-foreground">{index + 1}</span>
                <span className={landmark.fixed ? "text-cyan-400" : "text-muted-foreground/40"}>fixed</span>
                <span className={landmark.moving ? "text-amber-400" : "text-muted-foreground/40"}>moving</span>
                <span className="flex-1 text-right font-mono">
                  {residual === undefined ? "—" : `${format(residual)} ${unit}`}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => api.getState().removeLandmark(landmark.id)}
                  title="Remove this pair"
                >
                  <Trash2 />
                </Button>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex items-center gap-2">
        <div className="flex-1 text-xs text-muted-foreground">
          {residuals.rms === null
            ? `${needed} pairs needed for a ${constraint} fit${planar ? " in the plane" : ""}.`
            : `RMS ${format(residuals.rms)} ${unit} over ${pairs.length} pair${pairs.length === 1 ? "" : "s"}`}
        </div>
        {landmarks.length > 0 && (
          <Button type="button" variant="ghost" size="sm" onClick={() => api.getState().clearLandmarks()}>
            Clear
          </Button>
        )}
        <Button type="button" size="sm" disabled={!editable || pairs.length < needed} onClick={fit}>
          <Wand2 /> Fit
        </Button>
      </div>
    </div>
  );
};
