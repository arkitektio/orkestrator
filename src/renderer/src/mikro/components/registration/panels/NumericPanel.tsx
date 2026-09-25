import { Crosshair } from "lucide-react";
import { useMemo } from "react";
import { Button } from "@/core/ui/button";
import { useLayerWorldBoxGetter, useSceneDisplayMode, useSceneWorld } from "../../scene/sceneHost";
import { constrainParts } from "../math/constraints";
import { composeAboutPivot, decomposeAboutPivot, type DeltaParts } from "../math/decompose";
import { boxCenter } from "../math/fit";
import { applyPoint, type Vec3 } from "../math/mat4";
import { useRegistration, useRegistrationApi } from "../store/context";
import { NumberField } from "./NumberField";

const AXES = ["x", "y", "z"] as const;

const Row = (props: { title: string; children: React.ReactNode }) => (
  <div className="flex flex-col gap-1">
    <div className="text-[0.65rem] font-medium uppercase tracking-wide text-muted-foreground">{props.title}</div>
    <div className="grid grid-cols-3 gap-1">{props.children}</div>
  </div>
);

/**
 * The draft as numbers, ABOUT THE PIVOT — so rotating in place reads as a
 * rotation and zero translation, not as the large origin-anchored offset the
 * stored matrix really has (COORDINATE_SYSTEMS.md §0: the pivot is a way of
 * talking about the transform; what is stored is origin-anchored).
 *
 * Reads the same `delta` the gizmo writes, so the two are always in step; an
 * edit recomposes the whole draft as one undo step, clamped to the constraint.
 */
export const NumericPanel = () => {
  const api = useRegistrationApi();
  const delta = useRegistration((state) => state.delta);
  const pivot = useRegistration((state) => state.pivot);
  const constraint = useRegistration((state) => state.constraint);
  const editable = useRegistration((state) => state.session?.phase === "editing");
  const movingLayerId = useRegistration((state) => state.session?.movingLayerId ?? null);
  const flat = useSceneDisplayMode() === "2D";
  const world = useSceneWorld();
  const getBox = useLayerWorldBoxGetter();

  const parts = useMemo(() => decomposeAboutPivot(delta, pivot), [delta, pivot]);
  // The pivot is stored attached to the data (base world); what the user sees,
  // and types, is where it is drawn.
  const shownPivot = useMemo(() => applyPoint(delta, pivot), [delta, pivot]);
  const slots = flat ? ([0, 1] as const) : ([0, 1, 2] as const);
  const unit = world.unit === "px" ? "px" : world.unit;

  if (!parts) {
    return (
      <div className="rounded border border-destructive/40 p-2 text-xs text-destructive">
        The adjustment collapses an axis and cannot be read as move / rotate / scale. Undo the last step.
      </div>
    );
  }

  const commit = (next: DeltaParts, editedScaleAxis: 0 | 1 | 2 = 0) =>
    api.getState().replaceDelta(composeAboutPivot(constrainParts(next, constraint, editedScaleAxis), pivot));

  const withAt = (values: Vec3, index: number, value: number): Vec3 => {
    const next: Vec3 = [...values];
    next[index] = value;
    return next;
  };

  const centerPivot = () => {
    const box = movingLayerId ? getBox([movingLayerId]) : null;
    if (!box) return;
    // The box is of the layer AS DRAWN (preview included), which is where the
    // user sees its middle; the store takes it back into base world.
    api.getState().setDrawnPivot(boxCenter(box));
  };

  return (
    <div className="flex flex-col gap-2">
      <Row title={`Move (${unit})`}>
        {slots.map((slot) => (
          <NumberField
            key={slot}
            label={AXES[slot]}
            value={parts.translation[slot]}
            disabled={!editable}
            onCommit={(value) => commit({ ...parts, translation: withAt(parts.translation, slot, value) })}
          />
        ))}
      </Row>

      <Row title="Rotate (°)">
        {(flat ? ([2] as const) : ([0, 1, 2] as const)).map((slot) => (
          <NumberField
            key={slot}
            label={AXES[slot]}
            value={parts.rotation[slot]}
            digits={2}
            disabled={!editable}
            onCommit={(value) => commit({ ...parts, rotation: withAt(parts.rotation, slot, value) })}
          />
        ))}
      </Row>

      {constraint !== "rigid" && (
        <Row title={constraint === "similarity" ? "Scale (uniform)" : "Scale"}>
          {(constraint === "similarity" ? ([0] as const) : slots).map((slot) => (
            <NumberField
              key={slot}
              label={constraint === "similarity" ? "×" : AXES[slot]}
              value={parts.scale[slot]}
              digits={4}
              disabled={!editable}
              onCommit={(value) => {
                // Zero collapses the axis; a sign flip is a mirror, which only
                // an explicit affine may author.
                if (value === 0 || (constraint === "similarity" && value < 0)) return;
                commit({ ...parts, scale: withAt(parts.scale, slot, value) }, slot);
              }}
            />
          ))}
        </Row>
      )}

      {constraint === "affine" && (
        <Row title="Shear">
          {(flat ? ([0] as const) : ([0, 1, 2] as const)).map((index) => (
            <NumberField
              key={index}
              label={["xy", "xz", "yz"][index]}
              value={parts.shear[index]}
              digits={4}
              disabled={!editable}
              onCommit={(value) => commit({ ...parts, shear: withAt(parts.shear, index, value) })}
            />
          ))}
        </Row>
      )}

      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <div className="text-[0.65rem] font-medium uppercase tracking-wide text-muted-foreground">
            Pivot ({unit})
          </div>
          <Button type="button" variant="ghost" size="xs" onClick={centerPivot} title="Put the pivot at the layer's centre">
            <Crosshair /> centre
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-1">
          {slots.map((slot) => (
            <NumberField
              key={slot}
              label={AXES[slot]}
              value={shownPivot[slot]}
              onCommit={(value) => api.getState().setDrawnPivot(withAt(shownPivot, slot, value))}
            />
          ))}
        </div>
      </div>

      {parts.reflected && (
        <div className="text-[0.65rem] text-amber-500">This adjustment mirrors the data.</div>
      )}
    </div>
  );
};
