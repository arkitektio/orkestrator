import { Maximize2, Waypoints } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/core/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/core/components/ui/toggle-group";
import { useLayerWorldBoxGetter, useSceneHostLayers, useSceneWorld } from "../../scene/sceneHost";
import { CONSTRAINTS, type Constraint } from "../math/constraints";
import { fitDelta } from "../math/fit";
import { useRegistration, useRegistrationApi } from "../store/context";
import type { ApplyMode } from "../store/registrationStore";
import { LandmarkPanel } from "./LandmarkPanel";
import { NumericPanel } from "./NumericPanel";
import { SaveBar } from "./SaveBar";

const Section = (props: { title: string; children: React.ReactNode }) => (
  <div className="flex flex-col gap-1.5">
    <div className="text-xs font-medium">{props.title}</div>
    {props.children}
  </div>
);

/** The active session: what is moving, how it may move, by how much, and Save. */
export const SessionPanel = () => {
  const api = useRegistrationApi();
  const session = useRegistration((state) => state.session);
  const constraint = useRegistration((state) => state.constraint);
  const applyMode = useRegistration((state) => state.applyMode);
  const layers = useSceneHostLayers();
  const world = useSceneWorld();
  const fixedLayerId = useRegistration((state) => state.fixedLayerId);
  const getBox = useLayerWorldBoxGetter();
  if (!session) return null;

  /**
   * A coarse START, not a registration: bring the moving layer's box onto the
   * reference's. For the freshly seeded edge, where an identity between a pixel
   * grid and a µm world leaves the data hundreds of times too large and
   * somewhere off screen.
   */
  const fitToReference = () => {
    const members = new Set(session.memberLayerIds);
    const reference = fixedLayerId
      ? [fixedLayerId]
      : layers.filter((layer) => !members.has(layer.id) && layer.placeable && layer.visible).map((layer) => layer.id);
    // Both boxes as DRAWN, so the step composes onto whatever draft is there.
    const moving = getBox([session.movingLayerId]);
    const fixed = getBox(reference);
    if (!moving || !fixed) {
      toast.error("Fitting needs an image or label layer on both sides — their extent is what gets matched.");
      return;
    }
    api.getState().applyStep(fitDelta(moving, fixed, constraint));
  };

  const nameOf = (id: string) => layers.find((layer) => layer.id === id)?.name ?? id;
  const others = session.memberLayerIds.filter((id) => id !== session.movingLayerId);

  return (
    <div className="flex flex-col gap-3 p-3">
      <div className="flex flex-col gap-1 rounded border border-border p-2">
        <div className="flex items-center gap-1.5 text-sm font-medium">
          <Waypoints className="size-3.5 shrink-0" />
          <span className="truncate">{nameOf(session.movingLayerId)}</span>
        </div>
        <div className="text-xs text-muted-foreground">into {world.name ?? "the scene's world"}</div>
        {others.length > 0 && (
          <div className="text-xs text-amber-500">
            Also moves {others.map(nameOf).join(", ")} — {others.length === 1 ? "it shares" : "they share"} this
            registration.
          </div>
        )}
        {/* A registration belongs to the WORLD, not to this scene: "every scene
            composing over this system sees the same list". Say so once, where
            the decision to save is made. */}
        <div className="text-[0.65rem] text-muted-foreground">
          The registration belongs to the world space, so every scene over it moves too.
        </div>
      </div>

      <Section title="Allow">
        <ToggleGroup
          type="single"
          size="sm"
          variant="outline"
          value={constraint}
          onValueChange={(value) => value && api.getState().setConstraint(value as Constraint)}
          className="justify-start"
        >
          {CONSTRAINTS.map((option) => (
            <ToggleGroupItem key={option.value} value={option.value} title={option.description} className="text-xs">
              {option.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <div className="text-[0.65rem] text-muted-foreground">
          {CONSTRAINTS.find((option) => option.value === constraint)?.description}
        </div>
      </Section>

      <Section title="Adjustment">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="self-start"
          disabled={session.phase !== "editing"}
          onClick={fitToReference}
          title="Move (and, unless rigid, scale) the layer onto the reference layer's extent"
        >
          <Maximize2 /> Fit to reference
        </Button>
        <NumericPanel />
        <div className="text-[0.65rem] text-muted-foreground">
          Drag the handles in the view — arrows move, rings turn (⇧ snaps to 15°), boxes scale. Alt + arrows
          nudge by a pixel (⇧ for ten). Hold B to blink the layer off and check the overlay.
        </div>
      </Section>

      <Section title="Landmarks">
        <LandmarkPanel />
      </Section>

      <Section title="Preview">
        <ToggleGroup
          type="single"
          size="sm"
          variant="outline"
          value={applyMode}
          onValueChange={(value) => value && api.getState().setApplyMode(value as ApplyMode)}
          className="justify-start"
        >
          <ToggleGroupItem value="live" className="text-xs" title="Redraw the data while dragging">
            While dragging
          </ToggleGroupItem>
          <ToggleGroupItem value="release" className="text-xs" title="Drag an outline; redraw the data on release. For heavy scenes.">
            On release
          </ToggleGroupItem>
        </ToggleGroup>
      </Section>

      <SaveBar />
    </div>
  );
};
