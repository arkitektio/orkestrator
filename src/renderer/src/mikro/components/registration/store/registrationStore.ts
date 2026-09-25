/**
 * The registration SESSION: one edge being adjusted, and the draft on top of it.
 *
 * The whole draft is `delta` — a world-space 4×4 that left-multiplies the
 * edge's current state. Everything a user does lands in it: a gizmo drag, an
 * arrow-key nudge, a number typed into the panel, a landmark fit. That single
 * representation is what lets the gizmo, the numeric panel and the solver
 * coexist without knowing about each other, and what makes undo trivial (a
 * stack of matrices).
 *
 * The store is plain zustand with no React and no scene imports, so its suite
 * runs in `node`. It does not TOUCH the scene: `canvas/PreviewSync` mirrors
 * `delta` into the scene's placement preview, and `hooks/useRegistrationSave`
 * folds it into the edge.
 *
 * Lifecycle around a save — the part that is easy to get wrong:
 *
 *   editing ──save──▶ saving ──(scene shows the new edge state)──▶ rebase ──▶ editing
 *
 * While `saving`, the preview is left exactly as it is. When the refetched
 * scene arrives the scene store drops the preview in the same `set` the new
 * server placement lands in (COORDINATE_SYSTEMS.md §1 R1a), and `rebase`
 * zeroes `delta` to match. Zeroing earlier would snap the layer back for a
 * round trip; zeroing later would apply the delta twice.
 */
import { createStore, type StoreApi } from "zustand/vanilla";
import { projectToConstraint, type Constraint } from "../math/constraints";
import { applyPoint, identity, invert, isIdentity, mul, type Mat4, type Vec3 } from "../math/mat4";
import type { Box } from "../math/fit";
import type { LandmarkPair } from "../math/solvers";

export type SessionPhase = "editing" | "saving";

/** One correspondence. Either half may be missing while it is being placed. */
export type Landmark = {
  id: number;
  /** On the fixed layer, in world coordinates. */
  fixed: Vec3 | null;
  /**
   * On the moving layer, in BASE-world coordinates — where the point sits under
   * the server placement, i.e. `delta⁻¹ · (where it was clicked)`. Storing it
   * there rather than where it was clicked keeps the landmark attached to the
   * DATA: it stays correct however the draft moves afterwards.
   */
  moving: Vec3 | null;
};

export type PickSide = "fixed" | "moving";

/** How the draft reaches the scene. `release` is for scenes too heavy to replan per frame. */
export type ApplyMode = "live" | "release";

export type RegistrationSession = {
  edgeId: string;
  edgeVersion: number | null;
  inverted: boolean;
  /** The layer the user asked to register. */
  movingLayerId: string;
  /** Every scene layer looking through the edge — they all move together. */
  memberLayerIds: string[];
  phase: SessionPhase;
};

export type RegistrationState = {
  session: RegistrationSession | null;
  delta: Mat4;
  /** Set while a gizmo drag is in flight: the delta the drag started from. */
  gestureStart: Mat4 | null;
  /**
   * The point gestures rotate and scale about — in BASE-world coordinates, like
   * a landmark's moving half: attached to the DATA, not to the screen. It is
   * DRAWN at `delta · pivot` (`drawnPivot`), so the gizmo follows the layer
   * through every translation with no bookkeeping, and the numeric panel's
   * "move" reads as how far that point of the data has travelled.
   */
  pivot: Vec3;
  /** The moving layer's world box under the server placement, for the outline. */
  baseBox: Box | null;
  constraint: Constraint;
  applyMode: ApplyMode;
  undoStack: Mat4[];
  redoStack: Mat4[];
  landmarks: Landmark[];
  pickSide: PickSide | null;
  /** The layer fixed-side picks land on. */
  fixedLayerId: string | null;
  /** A pick is armed but the scene cannot deliver it (no probeable layer). */
  pickBlocked: boolean;
  setPickBlocked: (blocked: boolean) => void;
  /** The pair the table is pointing at; its markers are drawn larger. */
  highlightedLandmarkId: number | null;
  setHighlightedLandmark: (id: number | null) => void;
  /** A layer waiting to become placeable so its session can start (seed flow). */
  pendingLayerId: string | null;
  /** Why the scene could not draw the current draft, if it could not. */
  previewIssue: string | null;
  setPreviewIssue: (issue: string | null) => void;

  begin: (
    session: Omit<RegistrationSession, "phase">,
    options?: { pivot?: Vec3; baseBox?: Box | null; fixedLayerId?: string | null },
  ) => void;
  end: () => void;
  setMembers: (memberLayerIds: string[]) => void;
  setPending: (layerId: string | null) => void;

  /** A discrete edit (nudge, snap, fit): `delta ← G · delta`, one undo step. */
  applyStep: (gesture: Mat4) => void;
  /** Replace the draft outright (numeric panel, landmark fit): one undo step. */
  replaceDelta: (delta: Mat4) => void;
  beginGesture: () => void;
  /** During a drag: `delta ← G · gestureStart`. No undo step per frame. */
  updateGesture: (gesture: Mat4) => void;
  endGesture: () => void;
  cancelGesture: () => void;
  undo: () => void;
  redo: () => void;
  reset: () => void;

  /** Base-world. Use `setDrawnPivot` for a point picked on screen. */
  setPivot: (pivot: Vec3) => void;
  /** A point where it is DRAWN (a pick, a typed world coordinate). */
  setDrawnPivot: (world: Vec3) => void;
  setBaseBox: (box: Box | null) => void;
  setConstraint: (constraint: Constraint) => void;
  setApplyMode: (mode: ApplyMode) => void;

  setPickSide: (side: PickSide | null) => void;
  setFixedLayerId: (layerId: string | null) => void;
  /** A world-space click on `side`. Fills the open pair, or starts a new one. */
  addLandmarkPoint: (side: PickSide, world: Vec3) => void;
  removeLandmark: (id: number) => void;
  clearLandmarks: () => void;

  markSaving: () => void;
  /** The save failed: back to editing with the draft intact. */
  markEditing: () => void;
  /** The scene now shows the saved edge: the draft is part of the edge. */
  rebase: (next: { edgeId: string; edgeVersion: number | null; inverted: boolean; memberLayerIds: string[] }) => void;
};

const UNDO_LIMIT = 100;

const pushUndo = (stack: Mat4[], delta: Mat4): Mat4[] => [...stack, delta].slice(-UNDO_LIMIT);

/** The pairs with both halves placed — what the solver sees. */
export const completePairs = (landmarks: readonly Landmark[]): LandmarkPair[] =>
  landmarks.flatMap((landmark) =>
    landmark.fixed && landmark.moving ? [{ fixed: landmark.fixed, moving: landmark.moving }] : [],
  );

/** Where the pivot is DRAWN under the current draft. */
export const drawnPivot = (state: Pick<RegistrationState, "delta" | "pivot">): Vec3 =>
  applyPoint(state.delta, state.pivot);

/** Where a landmark's moving half is DRAWN under the current draft. */
export const movingWorldPosition = (landmark: Landmark, delta: Mat4): Vec3 | null =>
  landmark.moving ? applyPoint(delta, landmark.moving) : null;

export const isDirty = (state: Pick<RegistrationState, "delta">): boolean => !isIdentity(state.delta);

export const createRegistrationStore = (): StoreApi<RegistrationState> =>
  createStore<RegistrationState>()((set, get) => {
    let nextLandmarkId = 1;

    const commit = (delta: Mat4) =>
      set((state) => ({
        delta,
        undoStack: pushUndo(state.undoStack, state.delta),
        redoStack: [],
      }));

    return {
      session: null,
      delta: identity(),
      gestureStart: null,
      pivot: [0, 0, 0],
      baseBox: null,
      constraint: "similarity",
      applyMode: "live",
      undoStack: [],
      redoStack: [],
      landmarks: [],
      pickSide: null,
      fixedLayerId: null,
      pendingLayerId: null,
      pickBlocked: false,
      setPickBlocked: (pickBlocked) => set((state) => (state.pickBlocked === pickBlocked ? state : { pickBlocked })),
      highlightedLandmarkId: null,
      setHighlightedLandmark: (highlightedLandmarkId) => set({ highlightedLandmarkId }),
      previewIssue: null,
      setPreviewIssue: (previewIssue) =>
        set((state) => (state.previewIssue === previewIssue ? state : { previewIssue })),

      begin: (session, options) =>
        set({
          session: { ...session, phase: "editing" },
          delta: identity(),
          gestureStart: null,
          pivot: options?.pivot ?? [0, 0, 0],
          baseBox: options?.baseBox ?? null,
          undoStack: [],
          redoStack: [],
          landmarks: [],
          pickSide: null,
          fixedLayerId: options?.fixedLayerId ?? null,
          pendingLayerId: null,
        }),

      end: () =>
        set({
          session: null,
          previewIssue: null,
          baseBox: null,
          delta: identity(),
          gestureStart: null,
          undoStack: [],
          redoStack: [],
          landmarks: [],
          pickSide: null,
        }),

      setMembers: (memberLayerIds) =>
        set((state) => (state.session ? { session: { ...state.session, memberLayerIds } } : state)),

      setPending: (pendingLayerId) => set({ pendingLayerId }),

      applyStep: (gesture) => {
        if (get().session?.phase !== "editing") return;
        commit(mul(gesture, get().delta));
      },

      replaceDelta: (delta) => {
        if (get().session?.phase !== "editing") return;
        commit(delta);
      },

      beginGesture: () => {
        if (get().session?.phase !== "editing") return;
        set((state) => ({ gestureStart: state.delta }));
      },

      updateGesture: (gesture) => {
        const start = get().gestureStart;
        if (!start) return;
        // From the drag's START, never frame to frame: a drag that returns to
        // where it began returns the layer exactly.
        set({ delta: mul(gesture, start) });
      },

      endGesture: () =>
        set((state) => {
          if (!state.gestureStart) return state;
          // One undo step per drag — and none for a click that moved nothing.
          const moved = state.gestureStart !== state.delta;
          return {
            gestureStart: null,
            undoStack: moved ? pushUndo(state.undoStack, state.gestureStart) : state.undoStack,
            redoStack: moved ? [] : state.redoStack,
          };
        }),

      cancelGesture: () =>
        set((state) => (state.gestureStart ? { delta: state.gestureStart, gestureStart: null } : state)),

      undo: () =>
        set((state) => {
          const previous = state.undoStack.at(-1);
          if (!previous || state.session?.phase !== "editing") return state;
          return {
            delta: previous,
            undoStack: state.undoStack.slice(0, -1),
            redoStack: [...state.redoStack, state.delta],
          };
        }),

      redo: () =>
        set((state) => {
          const next = state.redoStack.at(-1);
          if (!next || state.session?.phase !== "editing") return state;
          return {
            delta: next,
            redoStack: state.redoStack.slice(0, -1),
            undoStack: pushUndo(state.undoStack, state.delta),
          };
        }),

      reset: () => {
        if (get().session?.phase !== "editing" || isIdentity(get().delta)) return;
        commit(identity());
      },

      setPivot: (pivot) => set({ pivot }),

      setDrawnPivot: (world) => {
        const inverse = invert(get().delta);
        if (inverse) set({ pivot: applyPoint(inverse, world) });
      },

      setBaseBox: (baseBox) => set({ baseBox }),

      setConstraint: (constraint) => {
        const state = get();
        const projected = projectToConstraint(state.delta, constraint, state.pivot);
        set({ constraint });
        // Tightening the family straightens the draft IN PLACE, as one
        // undoable step; loosening it changes nothing.
        if (projected !== state.delta && state.session?.phase === "editing") commit(projected);
      },

      setApplyMode: (applyMode) => set({ applyMode }),

      setPickSide: (pickSide) => set({ pickSide }),
      setFixedLayerId: (fixedLayerId) => set({ fixedLayerId }),

      addLandmarkPoint: (side, world) => {
        const state = get();
        let point = world;
        if (side === "moving") {
          const inverse = invert(state.delta);
          if (!inverse) return;
          point = applyPoint(inverse, world);
        }
        const open = state.landmarks.findIndex((landmark) => landmark[side] === null);
        const landmarks =
          open === -1
            ? [
                ...state.landmarks,
                { id: nextLandmarkId++, fixed: null, moving: null, [side]: point } as Landmark,
              ]
            : state.landmarks.map((landmark, index) =>
                index === open ? { ...landmark, [side]: point } : landmark,
              );
        // Alternate: a pair is one click on each layer, so the next click is
        // almost always meant for the other side.
        set({ landmarks, pickSide: side === "fixed" ? "moving" : "fixed" });
      },

      removeLandmark: (id) =>
        set((state) => ({ landmarks: state.landmarks.filter((landmark) => landmark.id !== id) })),

      clearLandmarks: () => set({ landmarks: [] }),

      markSaving: () =>
        set((state) =>
          state.session ? { session: { ...state.session, phase: "saving" }, gestureStart: null, pickSide: null } : state,
        ),

      markEditing: () =>
        set((state) => (state.session ? { session: { ...state.session, phase: "editing" } } : state)),

      rebase: (next) =>
        set((state) => {
          if (!state.session) return state;
          const folded = state.delta;
          return {
            session: { ...state.session, ...next, phase: "editing" },
            delta: identity(),
            gestureStart: null,
            undoStack: [],
            redoStack: [],
            // The draft became part of the placement, so "base world" moved by
            // it: carry everything expressed in it along — the pivot, and the
            // landmarks' moving halves — or they would detach from the data.
            // (`baseBox` is re-read from the scene by the session watcher.)
            pivot: applyPoint(folded, state.pivot),
            landmarks: state.landmarks.map((landmark) =>
              landmark.moving ? { ...landmark, moving: applyPoint(folded, landmark.moving) } : landmark,
            ),
          };
        }),
    };
  });
