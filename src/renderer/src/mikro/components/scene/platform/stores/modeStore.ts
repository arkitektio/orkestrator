import { createStore } from "zustand/vanilla";
import { immer } from "zustand/middleware/immer";
import { createScopedStoreHooks } from "@/core/util/createScopedStore";
import {
  CINEMATIC_DEFAULTS,
  type LightRig,
} from "../gpu/shading";
import {
  VOLUME_POST_DEFAULTS,
  type VolumePostSettings,
} from "../gpu/volumePost";

/**
 * Three modes, not seven. What used to be MOVE (no behaviour at all) and META
 * (hid the origin axis) are gone; SELECT folded into ANNOTATE as a pointer tool
 * alongside the shapes, and AUTO_PROBE became the `probeFollowsCursor` modifier
 * of PROBE. Camera behaviour that used to be an exclusive mode is now composable
 * booleans below.
 */
/**
 * DESIGN is the mesh designer: brush/blob extractions become meshes in a
 * session (`features/meshDesign`), committed together as one fabriks mesh
 * collection rather than as annotations. 3D-only, like the tools it hosts.
 */
export type InteractionMode = "NAVIGATE" | "ANNOTATE" | "PROBE" | "DESIGN";

/**
 * The DESIGN-mode tool vocabulary. DESIGN navigates like NAVIGATE — the
 * camera never fights a tool — and a tool only ACTS while its key is held.
 *
 * Two facts, kept apart: `selectedDesignTool` is the tool whose panel the
 * toolbar shows (picked by clicking it, or by pressing its key; sticky), and
 * `designTool` is the tool that owns the left button RIGHT NOW — the
 * selected one while its key is down, else null. The volume layers and the
 * camera branch on `designTool` only: null means "DESIGN is NAVIGATE at the
 * moment". The ids and their gesture classes live on the PLATFORM because
 * those consumers must branch on them; the tools themselves — labels, keys,
 * behaviour — live in `features/meshDesign/tools/registry.ts`. `trace` (a
 * stroke) and `seed` (a click) are the two RECONSTRUCT tools; which
 * reconstructor turns the gesture into a mesh is the designer's business,
 * not the platform's.
 */
export type DesignToolId =
  | "trace"
  | "seed"
  | "carve"
  | "stamp"
  | "sculpt"
  | "trim"
  | "lift"
  | "bridge"
  | "split";

/** Who captures a tool's gesture; see `meshDesign/tools/registry.ts`. */
export const DESIGN_TOOL_GESTURES: Record<
  DesignToolId,
  "volume-stroke" | "volume-click" | "surface" | "screen"
> = {
  trace: "volume-stroke",
  carve: "volume-stroke",
  seed: "volume-click",
  lift: "volume-click",
  bridge: "volume-click",
  stamp: "surface",
  sculpt: "surface",
  split: "surface",
  trim: "screen",
};
export type DisplayMode = "2D" | "3D";

export type DisplayModeOption = {
  label: string;
  value: DisplayMode;
  description?: string;
};

export type InteractionModeOption = {
  label: string;
  value: InteractionMode;
  description?: string;
};

/**
 * Canonical order and copy. Which of these are actually *offered* is decided by
 * `features/annotations/modeCompat.ts` — an option that would be inert is not shown.
 */
export const interactionModeOptions: InteractionModeOption[] = [
  {
    label: "Navigate",
    value: "NAVIGATE",
    description: "Pan, orbit and zoom the scene",
  },
  {
    label: "Annotate",
    value: "ANNOTATE",
    description: "Draw annotations, or drag-select existing ones (hold A)",
  },
  {
    label: "Probe",
    value: "PROBE",
    description: "Read the values under the cursor; click to pin a probe point (hold P)",
  },
  {
    label: "Design",
    value: "DESIGN",
    description:
      "Navigate as usual; hold a tool key (C trace, V seed, X carve…) and drag or click to build a mesh (hold M)",
  },
];

export const displayModeOptions: DisplayModeOption[] = [
  { label: "2D View", value: "2D", description: "Display in 2D mode" },
  { label: "3D View", value: "3D", description: "Display in 3D mode" },
];

export interface ModeState {
  interactionMode: InteractionMode;
  displayMode: DisplayMode;
  /**
   * Zoom towards the pointer instead of the orbit target (3D). Was the
   * CURSOR_ORBIT camera mode — a boolean now, because it composes with the
   * pivot setting rather than excluding it.
   */
  zoomToCursor: boolean;
  /**
   * Re-center the orbit pivot on the last *click*-probed point (3D). Was the
   * PROBE_ORBIT camera mode. See `platform/camera/orbitPivot.ts`.
   */
  pivotOnProbe: boolean;
  /**
   * Inertial ("smooth") orbiting: the camera coasts to a stop after the mouse
   * is released instead of stopping with it.
   *
   * OFF by default, overriding drei's `enableDamping = true`. The coast is no
   * longer charged as camera MOTION (`platform/camera/cameraMotion.ts` measures
   * a RELATIVE per-frame change, so the tail settles at full quality), but it
   * still costs full-resolution volume renders for the length of the decay and
   * still drives visibility/replan work after the gesture is over. Stopping
   * with the mouse is the cheaper and steadier default; the switch is there for
   * anyone who prefers the feel.
   */
  smoothOrbit: boolean;
  /**
   * Hover-to-probe. Was the AUTO_PROBE interaction mode, now a modifier of
   * PROBE — on by default, since entering PROBE is already the statement that
   * you want to read values. Lives here rather than on `viewerStore` so the
   * brick layers keep a single reactive subscription for pointer behaviour —
   * they write probes through the non-reactive store api precisely to avoid
   * re-renders.
   */
  probeFollowsCursor: boolean;
  /** The DESIGN tool whose panel is shown; sticky (see `DesignToolId`). */
  selectedDesignTool: DesignToolId | null;
  /** The selected tool's key is down: it owns the left button meanwhile. */
  designToolHeld: boolean;
  /** The ARMED design tool: the selected one while its key is held, else null. */
  designTool: DesignToolId | null;
  /**
   * The presentation/faithful switch. OFF is the SCIENTIFIC look and is the
   * renderer as it has always been, plus `NoToneMapping`; ON adds volume
   * shading, ACES grading and tricubic zoom smoothing.
   *
   * Session-only and per scene, by choice — see `CINEMATIC_MODE.md` §4.3/§9.
   * It lives here rather than on `viewerStore`'s chrome slice (where its
   * popover siblings live) because `BrickVolumeLayer` already subscribes to
   * this store, so the flag costs no new subscription on the hot path.
   *
   * INVARIANT C1: everything this gates is display-space. It never touches
   * clim, the transfer curve, gamma, the colormap, `volAlpha`, or the iso hit
   * test — which is what keeps the CPU transfer mirrors
   * (`shaderspec/raymarchStep.ts`, `shaderspec/opacityCorrection.ts`,
   * `octree/brickSampling.ts`, `model/phasor.ts`) valid with zero changes.
   */
  cinematic: boolean;
  /**
   * Normalized value at which the ISOSURFACE projection extracts its surface.
   *
   * Lives here and not on `probeSlice` despite the identical-looking slider:
   * this is a RENDER uniform that defines what the isosurface IS, whereas
   * `probeThreshold` only tunes how a first-hit probe marches. It must stay
   * session-only — `ProjectionNode` in `api/graphql.ts` is
   * `{children, kind, label, mode}`, so there is no field to persist it to.
   */
  isoThreshold: number;
  /**
   * Cinematic light rig. Defaults from `CINEMATIC_DEFAULTS` in
   * `platform/gpu/shading.ts`; exposed because `surfaceGain` in particular
   * needs tuning against real data. Inert while `cinematic` is false.
   */
  lightRig: LightRig;
  /**
   * Post-processing for the cinematic preset — bloom and grading, applied to
   * the volume target only (see `platform/gpu/volumePost.ts`). Session-only and
   * inert in scientific mode.
   */
  post: VolumePostSettings;
  interactionModeOptions: InteractionModeOption[];
  displayModeOptions: DisplayModeOption[];
  setInteractionMode: (mode: InteractionMode) => void;
  setDisplayMode: (mode: DisplayMode) => void;
  setZoomToCursor: (on: boolean) => void;
  setPivotOnProbe: (on: boolean) => void;
  setSmoothOrbit: (on: boolean) => void;
  setProbeFollowsCursor: (on: boolean) => void;
  /** Pick the tool whose panel is shown; `held` also arms it (its key went down). */
  selectDesignTool: (tool: DesignToolId | null, held?: boolean) => void;
  /** The tool key came up (or focus was lost): back to navigating. */
  releaseDesignTool: () => void;
  setCinematic: (on: boolean) => void;
  setIsoThreshold: (value: number) => void;
  setLightRig: (patch: Partial<LightRig>) => void;
  resetLightRig: () => void;
  setPost: (patch: Partial<VolumePostSettings>) => void;
  resetPost: () => void;
}

/**
 * `displayMode` seeds from the scene's `preferredView` (resolved by
 * `platform/camera/preferredView.ts`, which is where the AUTO policy lives) and is the
 * user's from then on — nothing rehydrates it, so switching view never fights
 * the scene's stated preference.
 */
export const createModeStore = ({
  displayMode = "2D",
}: { displayMode?: DisplayMode } = {}) =>
  createStore<ModeState>()(
    immer((set) => ({
    interactionMode: "NAVIGATE", // Default starting mode
    displayMode,
    zoomToCursor: false,
    pivotOnProbe: false,
    smoothOrbit: false,
    probeFollowsCursor: true,
    selectedDesignTool: "trace",
    designToolHeld: false,
    designTool: null,
    cinematic: false,
    isoThreshold: 0.5,
    lightRig: { ...CINEMATIC_DEFAULTS },
    post: { ...VOLUME_POST_DEFAULTS },
    interactionModeOptions,
    displayModeOptions,
    setInteractionMode: (mode) =>
      set((state) => {
        state.interactionMode = mode;
      }),
    setDisplayMode: (mode) =>
      set((state) => {
        state.displayMode = mode;
      }),
    setZoomToCursor: (on) =>
      set((state) => {
        state.zoomToCursor = on;
      }),
    setPivotOnProbe: (on) =>
      set((state) => {
        state.pivotOnProbe = on;
      }),
    setSmoothOrbit: (on) =>
      set((state) => {
        state.smoothOrbit = on;
      }),
    setProbeFollowsCursor: (on) =>
      set((state) => {
        state.probeFollowsCursor = on;
      }),
    selectDesignTool: (tool, held = false) =>
      set((state) => {
        state.selectedDesignTool = tool;
        state.designToolHeld = held && tool !== null;
        state.designTool = state.designToolHeld ? tool : null;
      }),
    releaseDesignTool: () =>
      set((state) => {
        state.designToolHeld = false;
        state.designTool = null;
      }),
    setCinematic: (on) =>
      set((state) => {
        state.cinematic = on;
      }),
    setIsoThreshold: (value) =>
      set((state) => {
        state.isoThreshold = value;
      }),
    setLightRig: (patch) =>
      set((state) => {
        Object.assign(state.lightRig, patch);
      }),
    resetLightRig: () =>
      set((state) => {
        state.lightRig = { ...CINEMATIC_DEFAULTS };
      }),
    setPost: (patch) =>
      set((state) => {
        Object.assign(state.post, patch);
      }),
    resetPost: () =>
      set((state) => {
        state.post = { ...VOLUME_POST_DEFAULTS };
      }),
    })),
  );

const {
  StoreContext: ModeStoreContext,
  useScopedStore: useModeStore,
  useStoreApi: useModeStoreApi,
} = createScopedStoreHooks<ModeState>("ModeStore");

export { ModeStoreContext, useModeStore, useModeStoreApi };
