import { createStore } from "zustand/vanilla";
import { immer } from "zustand/middleware/immer";
import { createScopedStoreHooks } from "@/core/util/createScopedStore";
import { AnnotationKind } from "@/mikro/api/graphql";
import { DEFAULT_TRACE_WEIGHTS, type TraceWeights } from "./enhancers/paths/vectorTrace/traceCost";

/**
 * The drawing tool types the drawer implements. Each maps to a AnnotationKind for
 * the mutation. SPHERE and CUBE are the volumetric (3D-only) tools: a probe
 * click anchors their center, a second click sets the radius
 * (`features/annotations/primitiveDraw.ts`).
 */
export type DrawingTool =
  | "RECTANGLE"
  | "ELLIPSE"
  | "POINT"
  | "LINE"
  | "POLYGON"
  | "PATH"
  | "SPHERE"
  | "CUBE";

/** The volumetric tools, anchored by a probe click rather than the draw plane. */
export const isPrimitiveTool = (
  tool: AnnotateTool | null | undefined,
): tool is "SPHERE" | "CUBE" => tool === "SPHERE" || tool === "CUBE";

/**
 * The tools whose 3D placement comes from the probe: the volume hover-probes
 * for them in ANNOTATE mode, and its click either places (POINT) or anchors
 * (SPHERE/CUBE) at the probed coordinate.
 */
export const isProbeDerivedTool = (
  tool: AnnotateTool | null | undefined,
): tool is "POINT" | "SPHERE" | "CUBE" =>
  tool === "POINT" || isPrimitiveTool(tool);

/**
 * The tools the vector enhancer applies to: their vertices are clicked one by
 * one, so each edge is a candidate for being traced through the data
 * (`features/annotations/enhancers/paths/vectorTrace/`) instead of drawn straight.
 */
export const isEnhanceableTool = (
  tool: AnnotateTool | null | undefined,
): tool is "LINE" | "POLYGON" | "PATH" =>
  tool === "LINE" || tool === "POLYGON" || tool === "PATH";

export const DRAWING_TOOL_TO_ROI_KIND: Record<DrawingTool, AnnotationKind> = {
  RECTANGLE: AnnotationKind.Rectangle,
  ELLIPSE: AnnotationKind.Ellipse,
  POINT: AnnotationKind.Point,
  LINE: AnnotationKind.Line,
  POLYGON: AnnotationKind.Polygon,
  PATH: AnnotationKind.Path,
  SPHERE: AnnotationKind.Sphere,
  CUBE: AnnotationKind.Cube,
};

/**
 * What the pointer does in ANNOTATE mode. "SELECT" is the marquee pointer
 * (`features/annotations/RectangleDrawer.tsx`); "BRUSH" is the intensity-skeleton
 * brush (`features/annotations/enhancers/paths/brushSkeleton/BrushStrokeSession.tsx` — a painted stroke, not a
 * clicked shape); every other value is a shape the `RoiDrawer` draws.
 *
 * Deliberately a separate union from `DrawingTool`: `DRAWING_TOOL_TO_ROI_KIND`
 * is a *total* `Record<DrawingTool, AnnotationKind>` that the drawer indexes unguarded,
 * so widening `DrawingTool` would force either a lying `AnnotationKind` entry for
 * SELECT/BRUSH or a partial map for all the real tools.
 *
 * Drawing and the pointer tools are then mutually exclusive by construction:
 * `isDrawingTool(activeTool)` holds exactly when a shape tool is armed.
 */
export type AnnotateTool = "SELECT" | "BRUSH" | "BLOB" | DrawingTool;

export const isDrawingTool = (
  tool: AnnotateTool | null | undefined,
): tool is DrawingTool => tool != null && tool in DRAWING_TOOL_TO_ROI_KIND;

/**
 * The annotation enhancers. Declared here, not in `features/annotations/enhancers/registry`,
 * because the registry's panels consume this store — the id union living with
 * the state keeps the import graph acyclic.
 */
export type AnnotationEnhancerId =
  | "vector-trace"
  | "intensity-skeleton"
  | "smooth-blob";

/**
 * A shape the user just drew, held only until the server confirms it. Drawing
 * targets the SCENE, whose annotation collection is registered into the world,
 * so world coordinates are both what is rendered and what is submitted — there
 * is no per-layer voxel copy to keep any more.
 */
export interface DrawnRoi {
  id: string;
  kind: AnnotationKind;
  /**
   * The tool that drew it, kept so the local preview can be re-stroked with the
   * right outline. `AnnotationKind` alone is not enough to invert — it has values with
   * no drawing tool — and this state never leaves the client.
   */
  tool: DrawingTool;
  /** World-space vectors, for rendering and for the mutation */
  worldVectors: Array<{ x: number; y: number; z: number }>;
  /**
   * The server annotation this preview became, once the mutation answered.
   * The preview OUTLIVES the mutation: dropping it the moment the server
   * confirms would blink the shape off screen until the annotation layer's own
   * query returns it (a fresh layer has to mount first, so on a scene's first
   * annotation that gap is the whole scope reconcile plus a query). Cleared by
   * `resolvePersistedRois` when the persisted copy actually renders.
   */
  persistedId?: string;
  /**
   * The collection the annotation landed in. A scene can carry SEVERAL
   * annotation layers (one per collection — see `AnnotationsPanel`), each
   * polling its own query, so a layer may only expire previews it is actually
   * responsible for. Without this an unrelated layer's poll would time out a
   * preview whose annotation only ever appears in another layer's result.
   */
  persistedCollectionId?: string;
  /** When the stamp was made — see `PERSISTED_PREVIEW_TIMEOUT_MS`. */
  persistedAt?: number;
}

/**
 * How long a confirmed preview may wait for its persisted copy before it is
 * dropped anyway. Without this a shape whose annotation never comes back in
 * its collection's query (filtered out, deleted server-side, a collection
 * mismatch) would strand its preview on screen for the session.
 */
export const PERSISTED_PREVIEW_TIMEOUT_MS = 15_000;

export interface RoiDrawingState {
  activeTool: AnnotateTool | null;
  drawnRois: DrawnRoi[];
  /**
   * World-space center for the next SPHERE/CUBE session — seeded by a probe
   * click on the volume, consumed (and cleared) by `RoiDrawer` after its reset
   * effect. Store-held rather than an imperative handle so it survives both
   * the drawer's tool/mode reset and its remount on a 2D↔3D display flip.
   */
  pendingPrimitiveAnchor: [number, number, number] | null;
  /**
   * True while the drawer is sizing an anchored SPHERE/CUBE. The volume's
   * click handler checks it (plus a null `pendingPrimitiveAnchor`) before
   * seeding, so the COMMIT click — which may also hit the volume mesh — can
   * never re-anchor. A store flag rather than R3F stopPropagation because
   * raycast ordering between the draw plane and the volume is
   * camera-dependent.
   */
  primitiveSessionActive: boolean;
  /**
   * Which enhancers are on. For "vector-trace": each clicked edge of an
   * enhanceable tool (LINE/POLYGON/PATH) is traced through the data instead of
   * drawn straight. All off by default — plain clicking must stay plain.
   */
  enhancersOn: Partial<Record<AnnotationEnhancerId, boolean>>;
  setEnhancerOn: (id: AnnotationEnhancerId, on: boolean) => void;
  /**
   * What the vector enhancer's A* considers cheap to travel through. Held here
   * (not in a component) because the panel edits them while a chain is
   * half-drawn, and the drawer reads them at click time — the next hop should
   * answer to the slider the user just moved.
   */
  traceWeights: TraceWeights;
  setTraceWeights: (weights: Partial<TraceWeights>) => void;
  /**
   * The active enhancer's status line — why the last enhanced edge fell back
   * to a straight segment, why an extraction detoured, or null. The toolbar
   * shows it: a silently degraded result just looks broken.
   */
  enhancerMessage: string | null;
  setEnhancerMessage: (message: string | null) => void;
  setActiveTool: (tool: AnnotateTool | null) => void;
  addDrawnRoi: (roi: DrawnRoi) => void;
  removeDrawnRoi: (id: string) => void;
  clearDrawnRois: () => void;
  /**
   * The server confirmed this preview as `annotationId`. Keeps it on screen —
   * `resolvePersistedRois` is what finally drops it, once the persisted copy
   * is actually being drawn.
   */
  markDrawnRoiPersisted: (
    id: string,
    annotation: { id: string; collectionId: string },
    now?: number,
  ) => void;
  /**
   * One annotation layer reporting what its query returned. Drops every
   * confirmed preview whose annotation is now in hand, plus any of THIS
   * collection's that waited past `PERSISTED_PREVIEW_TIMEOUT_MS`.
   *
   * Unconfirmed previews are never touched: a failed mutation must not
   * silently lose the user's shape. Neither are other collections' — see
   * `persistedCollectionId`.
   */
  resolvePersistedRois: (
    collectionId: string,
    annotationIds: Iterable<string>,
    now?: number,
  ) => void;
  setPendingPrimitiveAnchor: (anchor: [number, number, number] | null) => void;
  setPrimitiveSessionActive: (active: boolean) => void;
}

export const createRoiDrawingStore = () =>
  createStore<RoiDrawingState>()(
    immer((set) => ({
      activeTool: "RECTANGLE",
      drawnRois: [],
      pendingPrimitiveAnchor: null,
      primitiveSessionActive: false,
      enhancersOn: {},
      setEnhancerOn: (id, on) =>
        set((state) => {
          state.enhancersOn[id] = on;
        }),
      traceWeights: DEFAULT_TRACE_WEIGHTS,
      setTraceWeights: (weights) =>
        set((state) => {
          state.traceWeights = { ...state.traceWeights, ...weights };
        }),
      enhancerMessage: null,
      setEnhancerMessage: (message) =>
        set((state) => {
          state.enhancerMessage = message;
        }),
      setActiveTool: (tool) =>
        set((state) => {
          state.activeTool = tool;
        }),
      setPendingPrimitiveAnchor: (anchor) =>
        set((state) => {
          state.pendingPrimitiveAnchor = anchor;
        }),
      setPrimitiveSessionActive: (active) =>
        set((state) => {
          state.primitiveSessionActive = active;
        }),
      addDrawnRoi: (roi) =>
        set((state) => {
          state.drawnRois.push(roi);
        }),
      removeDrawnRoi: (id) =>
        set((state) => {
          state.drawnRois = state.drawnRois.filter((r) => r.id !== id);
        }),
      clearDrawnRois: () =>
        set((state) => {
          state.drawnRois = [];
        }),
      markDrawnRoiPersisted: (id, annotation, now = Date.now()) =>
        set((state) => {
          const roi = state.drawnRois.find((r) => r.id === id);
          if (!roi) return;
          roi.persistedId = annotation.id;
          roi.persistedCollectionId = annotation.collectionId;
          roi.persistedAt = now;
        }),
      resolvePersistedRois: (collectionId, annotationIds, now = Date.now()) =>
        set((state) => {
          const rendered = new Set(annotationIds);
          const next = state.drawnRois.filter((roi) => {
            if (!roi.persistedId) return true;
            if (rendered.has(roi.persistedId)) return false;
            // Someone else's collection: not this layer's to expire.
            if (roi.persistedCollectionId !== collectionId) return true;
            return now - (roi.persistedAt ?? now) < PERSISTED_PREVIEW_TIMEOUT_MS;
          });
          // Skip the write when nothing resolved — this runs on every poll.
          if (next.length !== state.drawnRois.length) state.drawnRois = next;
        }),
    })),
  );

const {
  StoreContext: RoiDrawingStoreContext,
  useScopedStore: useRoiDrawingStore,
  useStoreApi: useRoiDrawingStoreApi,
} = createScopedStoreHooks<RoiDrawingState>("RoiDrawingStore");

export {
  RoiDrawingStoreContext,
  useRoiDrawingStore,
  useRoiDrawingStoreApi,
};
