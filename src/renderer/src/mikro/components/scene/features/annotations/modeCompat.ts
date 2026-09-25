import type { DisplayMode, InteractionMode } from "../../platform/stores/modeStore";
import type { AnnotateTool } from "./roiDrawingStore";

/**
 * Which interaction modes and annotate tools are *offered*, given the current
 * view. The rule lives here rather than in the pickers so that the toolbar, the
 * ROI toolbar and the coercion guard can never disagree about what is active.
 *
 * The principle: an option that would be inert is not shown. Marquee select
 * does nothing in 3D; probing does nothing without a probeable layer.
 */

export type ModeContext = {
  displayMode: DisplayMode;
  /** At least one layer can answer a probe. See `hasProbeableLayer`. */
  hasProbeableLayer: boolean;
};

/** Canonical order — the pickers render exactly this, filtered. */
const ALL_MODES: InteractionMode[] = ["NAVIGATE", "ANNOTATE", "PROBE", "DESIGN"];

const ALL_TOOLS: AnnotateTool[] = [
  "SELECT",
  "RECTANGLE",
  "ELLIPSE",
  "POLYGON",
  "SPHERE",
  "CUBE",
  "POINT",
  "LINE",
  "PATH",
  "BRUSH",
  // BLOB is a DESIGN-mode tool (a grown surface is a mesh, not an annotation);
  // it stays an `AnnotateTool` so the shared capture keys on it, but ANNOTATE
  // never offers it.
];

/**
 * Tools that only make sense on the flat draw plane. Just the marquee: it has
 * nothing to drag against in 3D.
 *
 * The planar shapes used to be here too, because in 3D they landed on an
 * arbitrary z slab (`currentZ`, a flat-view concept). They no longer do — in 3D
 * every vertex is placed by the volume probe, on the data (`RoiDrawer`), so a
 * rectangle drawn in 3D is a real box between two probed corners.
 */
const FLAT_ONLY_TOOLS = new Set<AnnotateTool>(["SELECT"]);

/** The volumetric tools: anchored by a probe click on the volume — 3D only. */
const VOLUMETRIC_TOOLS = new Set<AnnotateTool>(["SPHERE", "CUBE"]);

/**
 * The skeleton brush and the smooth blob: probe-driven gestures on the
 * volume — 3D only. Kept out of `VOLUMETRIC_TOOLS`, whose membership drives
 * the anchor-then-size gesture (`isPrimitiveTool`); these have their own
 * session (`features/annotations/enhancers/paths/brushSkeleton/BrushStrokeSession.tsx`).
 */
const BRUSH_TOOLS = new Set<AnnotateTool>(["BRUSH", "BLOB"]);

/** Where a coercion lands. Never null: a null tool leaves ANNOTATE inert. */
export const FALLBACK_MODE: InteractionMode = "NAVIGATE";

/**
 * The default tool per view: the volumetric sphere in 3D (marking around a
 * probed point IS the 3D gesture), the rectangle on the flat plane.
 */
export const fallbackToolFor = (
  ctx: Pick<ModeContext, "displayMode">,
): AnnotateTool => (ctx.displayMode === "3D" ? "SPHERE" : "RECTANGLE");

/**
 * Only the brick layers emit probes, and `sceneStore.layers` is *already*
 * exactly the brick-backed layers (`scene.layers.filter(isBrickLayer)` — images
 * AND label masks; the raw polymorphic list is `sceneLayers`). They all bail on
 * `visible === false`, so visibility is the whole predicate.
 *
 * Deliberately not gated on brick residency: that is streaming cadence, and
 * gating the mode picker on it would make the Probe button flicker while bricks
 * stream in.
 *
 * Equivalent by design to `effectiveProbeLayerId(…) !== null`
 * (`platform/probe/probeTargeting.ts`): some layer can answer the probe exactly
 * when some layer is visible.
 *
 * The 3D label raymarcher answers the probe too (first non-background hit —
 * `BrickLabelVolumeLayer`), so a mask-only 3D scene probes exactly what it
 * shows; the old "mask reports probeable while nothing responds" gap is
 * closed.
 */
export const hasProbeableLayer = (
  layers: readonly { visible?: boolean }[],
): boolean => layers.some((layer) => layer.visible !== false);

export function isInteractionModeAvailable(
  mode: InteractionMode,
  ctx: ModeContext,
): boolean {
  switch (mode) {
    case "PROBE":
      return ctx.hasProbeableLayer;
    // The designer works in both views: the volume tools (C/V/X/W/G) need
    // 3D, but lifting a label instance clicks the 2D plane and lofting
    // traces 2D slices — the mode itself only needs something probeable.
    case "DESIGN":
      return ctx.hasProbeableLayer;
    default:
      return true;
  }
}

export function availableInteractionModes(ctx: ModeContext): InteractionMode[] {
  return ALL_MODES.filter((mode) => isInteractionModeAvailable(mode, ctx));
}

/**
 * The marquee is 2D-only; the volumetric tools are 3D-only. Every shape tool
 * works in both — flat on the drawn slice, probe-placed in the volume. The
 * vector enhancer rides along in both too: it searches the box its anchors
 * span, which is a flat one when the flat view drew them.
 */
export function isAnnotateToolAvailable(
  tool: AnnotateTool,
  ctx: Pick<ModeContext, "displayMode">,
): boolean {
  if (FLAT_ONLY_TOOLS.has(tool)) return ctx.displayMode === "2D";
  if (VOLUMETRIC_TOOLS.has(tool) || BRUSH_TOOLS.has(tool))
    return ctx.displayMode === "3D";
  return true;
}

export function availableAnnotateTools(
  ctx: Pick<ModeContext, "displayMode">,
): AnnotateTool[] {
  return ALL_TOOLS.filter((tool) => isAnnotateToolAvailable(tool, ctx));
}

/**
 * The (mode, tool) pair that should be active. Returns the *same* values when
 * nothing needs to change, so the guard can identity-compare and skip the store
 * write — that is what stops a set → render → set loop.
 */
export function coerceModeState(
  requested: {
    interactionMode: InteractionMode;
    activeTool: AnnotateTool | null;
  },
  ctx: ModeContext,
): { interactionMode: InteractionMode; activeTool: AnnotateTool | null } {
  const interactionMode = isInteractionModeAvailable(
    requested.interactionMode,
    ctx,
  )
    ? requested.interactionMode
    : FALLBACK_MODE;

  // In DESIGN the designer owns the tool: it arms BRUSH/BLOB by held key and
  // `MeshDesignToolbar` insists on a design tool while the mode is active.
  // Evicting one here as "3D-only" would swap it for a shape, the toolbar
  // would put the brush back, and the two guards would loop until React gave
  // up ("Maximum update depth exceeded"). Whether a given design gesture
  // works on the flat view is the tool's own business (lift clicks the 2D
  // plane), so the annotator's availability rule does not apply.
  if (
    interactionMode === "DESIGN" &&
    requested.activeTool !== null &&
    BRUSH_TOOLS.has(requested.activeTool)
  ) {
    return { interactionMode, activeTool: requested.activeTool };
  }

  // Otherwise the tool is coerced whatever the active mode is, so flipping
  // back into ANNOTATE later never lands on a tool that cannot draw.
  const activeTool =
    requested.activeTool === null ||
    isAnnotateToolAvailable(requested.activeTool, ctx)
      ? requested.activeTool
      : fallbackToolFor(ctx);

  return { interactionMode, activeTool };
}
