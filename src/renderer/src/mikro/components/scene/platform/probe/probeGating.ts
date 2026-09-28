/**
 * When a picking layer arms its pointer handlers.
 *
 * **These are raycast gates, not bookkeeping** (OCTREE_RENDERER.md P20). R3F
 * drops an object from `internal.interaction` the moment its last handler prop
 * becomes `undefined`, and its `pointermove` path raycasts only the objects
 * carrying a pointer-move-family handler (`filterPointerEvents`). So
 * `onPointerMove={enabled ? handler : undefined}` REMOVES the object from the
 * per-move raycast, while a handler that early-returns on the same condition
 * has already paid for it — including, for the fabriks layer, a full
 * `BatchedMesh.raycast` over every mounted cell, in NAVIGATE mode, where
 * nothing could ever come of it.
 *
 * Click-class events (`pointerdown`/`pointerup`/`click`) are NOT filtered by
 * handler kind, so gating those matters too: an unarmed `onClick` costs a full
 * interaction-set raycast at the start of every orbit drag.
 *
 * The handler bodies keep their own mode checks as belt-and-braces — a stale
 * closure must not act — but these predicates are the primary gate.
 *
 * Pure and store-free (the `core/` rule): callers pass
 * `isDrawingTool(activeTool)` from `features/annotations/roiDrawingStore` rather than the tool
 * itself, so the "which tools count as drawing" rule keeps its single home.
 */

/** The interaction modes these predicates discriminate on. */
export type ProbeGateMode = "NAVIGATE" | "ANNOTATE" | "PROBE" | "DESIGN" | (string & {});

export interface ProbeGateInput {
  interactionMode: ProbeGateMode;
  /** `modeStore.probeFollowsCursor` — the PROBE-mode hover modifier. */
  probeFollowsCursor: boolean;
  /** `isDrawingTool(roiDrawingStore.activeTool)`: a shape tool is armed. */
  drawingToolActive: boolean;
  /**
   * The skeleton brush is armed (`activeTool === "BRUSH"`). Only the 3D
   * volume passes this: the brush paints through the volume's probe march,
   * so no other layer has any business arming for it.
   */
  brushToolActive?: boolean;
  /**
   * DESIGN only: a brush key (C/V/X) is held. Without one DESIGN behaves
   * exactly like NAVIGATE — no hover probe, no click capture.
   */
  designArmed?: boolean;
  /**
   * Whether this layer answers ANNOTATE-mode probing at all. True for the 3D
   * volume and the mesh collection — there the probe IS the placement, since a
   * volume has no draw plane. False for the 2D plane layer, where the
   * `RoiDrawer`'s own interaction plane drives the rubber band and a second
   * hover probe would only fight it for the event. The asymmetry is
   * deliberate — see COORDINATE_SYSTEMS.md.
   */
  annotateProbes: boolean;
}

/**
 * Hover probing follows the cursor: PROBE mode with the follow-cursor modifier
 * on, or ANNOTATE with a shape tool on a layer that answers annotate probes.
 *
 * The ANNOTATE clause deliberately covers EVERY shape tool, not just the
 * probe-derived ones: in 3D the `RoiDrawer`'s own plane returns early for
 * every non-primitive tool ("the cursor arrives through the probe subscription
 * instead"), so RECTANGLE and ELLIPSE rubber-band off the probe exactly as
 * POLYGON does. Narrowing this would leave those tools with no cursor in 3D.
 */
export const hoverProbeEnabled = ({
  interactionMode,
  probeFollowsCursor,
  drawingToolActive,
  brushToolActive = false,
  designArmed = false,
  annotateProbes,
}: ProbeGateInput): boolean =>
  (interactionMode === "PROBE" && probeFollowsCursor) ||
  (annotateProbes &&
    interactionMode === "ANNOTATE" &&
    (drawingToolActive || brushToolActive)) ||
  // DESIGN hosts only the brush/blob gestures, which paint through the probe —
  // and only while a modifier is held; otherwise it is NAVIGATE.
  (annotateProbes && interactionMode === "DESIGN" && brushToolActive && designArmed);

/**
 * Click probing: PROBE mode always — the follow-cursor modifier governs the
 * sweep, never the deliberate click — plus ANNOTATE with a shape tool, where
 * the click places or anchors the shape.
 */
export const clickProbeEnabled = ({
  interactionMode,
  drawingToolActive,
  brushToolActive = false,
  designArmed = false,
  annotateProbes,
}: ProbeGateInput): boolean =>
  interactionMode === "PROBE" ||
  (annotateProbes &&
    interactionMode === "ANNOTATE" &&
    (drawingToolActive || brushToolActive)) ||
  (annotateProbes && interactionMode === "DESIGN" && brushToolActive && designArmed);

/**
 * Annotation HOVER affordances (the attached action button): NAVIGATE, or
 * ANNOTATE with no shape tool armed — while drawing, the `RoiDrawer`'s plane
 * owns the pointer. Never PROBE, where a shape must not sit between the
 * pointer and the probe target.
 *
 * Arming a pointer-move-family handler puts every annotation object — the
 * per-shape meshes, the instanced points AND the merged `LineSegments2`
 * outline batches — into R3F's per-move raycast set (`filterPointerEvents`).
 * That is the price of a hover feature, paid only in the modes above;
 * `PointerMoveGate` (shell/SceneViewport.tsx) still suppresses the moves of a
 * camera drag.
 */
export const annotationHoverEnabled = ({
  interactionMode,
  drawingToolActive,
}: Pick<ProbeGateInput, "interactionMode" | "drawingToolActive">): boolean =>
  interactionMode === "NAVIGATE" ||
  (interactionMode === "ANNOTATE" && !drawingToolActive);
