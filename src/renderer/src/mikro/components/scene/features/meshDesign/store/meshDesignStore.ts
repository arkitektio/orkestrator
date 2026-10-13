import { createStore } from "zustand/vanilla";
import { createScopedStoreHooks } from "@/core/util/createScopedStore";
import type { SculptField } from "../field/sculptField";
import type { Vec3 } from "../field/stamps";

/**
 * The mesh DESIGN session: meshes extracted from the volume, waiting to be
 * committed together as ONE fabriks mesh collection.
 *
 * A designed mesh is not an annotation. Annotations are human-drawn and
 * light; a mesh is a derived, heavy artefact that is versioned wholesale —
 * nobody edits a triangle, they re-extract or re-bake. So the session holds
 * plain indexed geometry in scene WORLD coordinates, one entry per future
 * fabriks object, and `commitDesign.ts` bakes the lot into a prefix.
 *
 * Object ids are positive integers, assigned once and never reused within a
 * session (they become `object_id` rows; the fabriks contract wants them
 * unique and ascending-sortable). A session started from an existing
 * collection (`origin`) keeps that collection's ids, so an edit-and-commit
 * writes a new version whose objects are recognisably the same ones.
 */

export type DesignMeshSource =
  | { kind: "tube"; layerId: string; level: number }
  | { kind: "blob"; layerId: string; level: number }
  | { kind: "imported"; collectionId: string; objectId: number };

export type DesignGeometry = {
  /** xyz interleaved, scene WORLD coordinates. */
  positions: Float32Array;
  /** Triangle list into `positions`. */
  indices: Uint32Array;
  /** Per-vertex normals, when whoever built the geometry computed them (the
   * geometry worker does); the overlay derives them otherwise. */
  normals?: Float32Array;
};

export type DesignMesh = {
  id: string;
  /** The fabriks object id this mesh becomes. */
  objectId: number;
  name: string;
  /** As extracted/imported — simplification always restarts from here. */
  original: DesignGeometry;
  /** What is shown and what gets committed. */
  current: DesignGeometry;
  /** Simplification applied to `original`, if any (1 = untouched). */
  simplifyRatio: number;
  source: DesignMeshSource;
  visible: boolean;
  /** Hue in degrees, for the overlay's per-mesh colour. */
  hue: number;
  /**
   * The signed-distance field the edits accumulate into (`sculptField.ts`).
   * Null for a mesh nothing has been unioned into or carved out of yet — a
   * lone reconstructed surface, an import; built from `current` by the first
   * edit that needs it.
   */
  field: SculptField | null;
};

/**
 * Which reconstructor turns a gesture into a mesh. The ids live with the
 * state, not in `reconstruct/registry` — the registry's modules consume this
 * store, and the union living here keeps the import graph acyclic (the
 * `AnnotationEnhancerId` idiom).
 */
export type ReconstructorId = "tube-fit" | "tube-surface" | "ball-fit" | "ball-surface";

/** The two reconstruct gestures: a painted stroke (trace) or one click (seed). */
export type ReconstructGesture = "stroke" | "click";

/** The knobs only the reconstructors read; the shared ones (radius, wrap,
 * detail…) stay on the brush store, where the capture reads them too. */
export type ReconstructParams = {
  /** Tube fit: fraction of the core-to-background drop that is the edge. */
  tubeEdge: number;
  /** Tube fit: smoothing passes along the tube. */
  tubeSmooth: number;
  /** Tube fit: multiplier on the measured radii. */
  tubeScale: number;
  /** Ball fit: one radius, or three with an orientation. */
  ballShape: "sphere" | "ellipsoid";
  /** Ball fit: multiplier on the fitted radii. */
  ballScale: number;
  /** Ball reconstructors: take the threshold from the clicked voxel's own
   * brightness instead of the Wrap slider. */
  autoThreshold: boolean;
};

export const DEFAULT_RECONSTRUCT_PARAMS: ReconstructParams = {
  tubeEdge: 0.5,
  tubeSmooth: 2,
  tubeScale: 1,
  ballShape: "ellipsoid",
  ballScale: 1,
  autoThreshold: true,
};

/**
 * The reconstruction that was applied LAST, for as long as it is the newest
 * act of the session.
 *
 * A reconstruction goes straight into the mesh — there is no preview to
 * accept. This record is what still lets it be TUNED: while it stands, a
 * slider move re-runs the reconstructor on the same gesture and replaces the
 * result in place (`reconstruct/apply.ts`), starting again from `before`.
 * Any other act ends it, and Undo removes the reconstruction like any step.
 */
export type LastReconstruction = {
  id: number;
  reconstructorId: ReconstructorId;
  gestureKind: ReconstructGesture;
  /** A copy of what the user drew — what a re-run reconstructs again. */
  gesture: { world: Vec3; voxel: Vec3 }[];
  layerId: string;
  /** The settings it was built with (`reconstruct/settings.ts`). */
  paramsKey: string;
  /** The mesh it went into. */
  meshId: string;
  /** That mesh as it was before; null when the reconstruction started it. */
  before: DesignMesh | null;
  /** What the reconstructor wants the user to know (a degradation, a size). */
  note: string | null;
};

/** What a tool hands the session when an edit lands. */
export type DesignSculpt = {
  field: SculptField | null;
  original: DesignGeometry;
  current: DesignGeometry;
  source: DesignMeshSource;
};

export type DesignStatus = "idle" | "editing" | "baking" | "uploading" | "committing" | "error";

export type StampShape = "sphere" | "box" | "ellipsoid";
export type SculptVariant = "inflate" | "deflate" | "smooth";

export type DesignOrigin = {
  collectionId: string;
  /** What the source collection is called: its name, or its store's key. */
  label: string;
  /** The scene layer showing the source collection — hidden on commit so the
   * old and the new version never render on top of each other. */
  layerId?: string;
};

export interface MeshDesignState {
  status: DesignStatus;
  message: string | null;
  meshes: DesignMesh[];
  selectedId: string | null;
  /** The collection this session was loaded from, when editing an existing one. */
  origin: DesignOrigin | null;
  nextObjectId: number;
  /** Undo/redo over the session's meshes — snapshots, since every geometry
   * and field is immutable. Depth-capped: fields are megabytes each. */
  history: DesignSnapshot[];
  future: DesignSnapshot[];
  /** The stamp tool's primitive (S). */
  stampShape: StampShape;
  /** The sculpt brush's verb (B). */
  sculptVariant: SculptVariant;
  /** A two-click tool's parked first point (bridge, split). */
  pendingPoint: { world: Vec3; voxel: Vec3 } | null;
  /** The newest act, when it was a reconstruction: still tunable. */
  last: LastReconstruction | null;
  /** A re-run of `last` is in flight (a slider moved). */
  retuning: boolean;
  /** The reconstructor picked per gesture; sticky across strokes. */
  reconstructors: Record<ReconstructGesture, ReconstructorId>;
  reconstructParams: ReconstructParams;

  /** Add a mesh; returns its session id. `objectId` is assigned unless given. */
  addMesh: (mesh: {
    name?: string;
    geometry: DesignGeometry;
    source: DesignMeshSource;
    objectId?: number;
  }) => string;
  /** Start an empty mesh and select it — the next C/V stroke goes there. */
  newMesh: () => string;
  /**
   * An edit landed: the mesh's new field and geometry in one step. Null
   * `id` (or an unknown one) starts a new mesh. Returns the mesh id.
   */
  applySculpt: (id: string | null, sculpt: DesignSculpt) => string;
  /**
   * A reconstruction landed: `applySculpt`, and it becomes `last` — tunable
   * until the next act.
   */
  applyReconstruction: (
    id: string | null,
    sculpt: DesignSculpt,
    record: Omit<LastReconstruction, "id" | "meshId" | "before">,
  ) => string;
  /**
   * A re-run of `last` landed: its mesh takes the new result IN PLACE — no
   * new undo step, the one the reconstruction made still removes it. False
   * when `last` has moved on meanwhile (nothing is applied).
   */
  retuneReconstruction: (
    lastId: number,
    sculpt: DesignSculpt,
    patch: Pick<LastReconstruction, "reconstructorId" | "paramsKey" | "note">,
  ) => boolean;
  undo: () => void;
  redo: () => void;
  setStampShape: (shape: StampShape) => void;
  setSculptVariant: (variant: SculptVariant) => void;
  setPendingPoint: (point: { world: Vec3; voxel: Vec3 } | null) => void;
  setRetuning: (retuning: boolean) => void;
  setReconstructor: (gesture: ReconstructGesture, id: ReconstructorId) => void;
  setReconstructParams: (patch: Partial<ReconstructParams>) => void;
  removeMesh: (id: string) => void;
  renameMesh: (id: string, name: string) => void;
  setVisible: (id: string, visible: boolean) => void;
  /** Replace the shown geometry (the simplifier's output) and record the ratio. */
  setCurrent: (id: string, current: DesignGeometry, simplifyRatio: number) => void;
  select: (id: string | null) => void;
  setOrigin: (origin: DesignOrigin | null) => void;
  setStatus: (status: DesignStatus, message?: string | null) => void;
  /** Drop every mesh and the origin — back to an empty session. */
  reset: () => void;
}

type DesignSnapshot = { meshes: DesignMesh[]; selectedId: string | null; nextObjectId: number };

/** How many sculpt steps stay undoable. Each snapshot only holds references
 * (meshes are immutable), but a step's field can be tens of MB — keep it short. */
export const UNDO_DEPTH = 8;

/** Triangles across the session; the overlay and the commit both cap on it. */
export const totalTriangles = (meshes: readonly DesignMesh[]): number =>
  meshes.reduce((sum, mesh) => sum + mesh.current.indices.length / 3, 0);

/** Above this, the commit dialog warns — a single-level fabriks is drawn whole. */
export const DESIGN_TRIANGLE_BUDGET = 2_000_000;

const GOLDEN_ANGLE = 137.508;

let sessionCounter = 0;
let reconstructionCounter = 0;

/** A mesh that holds nothing yet (`newMesh`): what lands in it IS the mesh. */
export const isEmptyMesh = (mesh: DesignMesh): boolean => !mesh.field && mesh.original.indices.length === 0;

export const createMeshDesignStore = () =>
  createStore<MeshDesignState>()((set, get) => {
    /** Push the current meshes onto the undo stack; a new act clears redo
     * and is, from now on, the newest one (`last` no longer is). */
    const snapshot = () => {
      const state = get();
      set({
        history: [
          ...state.history.slice(-(UNDO_DEPTH - 1)),
          { meshes: state.meshes, selectedId: state.selectedId, nextObjectId: state.nextObjectId },
        ],
        future: [],
        last: null,
      });
    };
    return {
    status: "idle",
    message: null,
    meshes: [],
    selectedId: null,
    origin: null,
    nextObjectId: 1,
    history: [],
    future: [],
    stampShape: "sphere" as StampShape,
    sculptVariant: "inflate" as SculptVariant,
    pendingPoint: null,
    last: null,
    retuning: false,
    reconstructors: { stroke: "tube-fit", click: "ball-fit" } as Record<ReconstructGesture, ReconstructorId>,
    reconstructParams: DEFAULT_RECONSTRUCT_PARAMS,

    addMesh: ({ name, geometry, source, objectId }) => {
      snapshot();
      const state = get();
      const assigned = objectId ?? state.nextObjectId;
      const id = `design-${++sessionCounter}`;
      const mesh: DesignMesh = {
        id,
        objectId: assigned,
        name: name ?? `Mesh ${assigned}`,
        original: geometry,
        current: geometry,
        simplifyRatio: 1,
        source,
        visible: true,
        hue: (state.meshes.length * GOLDEN_ANGLE) % 360,
        field: null,
      };
      set({
        meshes: [...state.meshes, mesh],
        selectedId: id,
        status: "editing",
        message: null,
        nextObjectId: Math.max(state.nextObjectId, assigned + 1),
      });
      return id;
    },
    newMesh: () => {
      const state = get();
      const id = state.addMesh({
        geometry: { positions: new Float32Array(0), indices: new Uint32Array(0) },
        source: { kind: "tube", layerId: "", level: 0 },
      });
      return id;
    },
    removeMesh: (id) => {
      snapshot();
      set((state) => {
        const meshes = state.meshes.filter((mesh) => mesh.id !== id);
        return {
          meshes,
          selectedId: state.selectedId === id ? null : state.selectedId,
          status: meshes.length === 0 && state.status === "editing" ? "idle" : state.status,
        };
      });
    },
    renameMesh: (id, name) =>
      set((state) => ({ meshes: state.meshes.map((mesh) => (mesh.id === id ? { ...mesh, name } : mesh)) })),
    setVisible: (id, visible) =>
      set((state) => ({ meshes: state.meshes.map((mesh) => (mesh.id === id ? { ...mesh, visible } : mesh)) })),
    setCurrent: (id, current, simplifyRatio) => {
      snapshot();
      set((state) => ({
        meshes: state.meshes.map((mesh) => (mesh.id === id ? { ...mesh, current, simplifyRatio } : mesh)),
      }));
    },
    select: (selectedId) => set({ selectedId }),
    setOrigin: (origin) => set({ origin }),
    setStampShape: (stampShape) => set({ stampShape }),
    setSculptVariant: (sculptVariant) => set({ sculptVariant }),
    setPendingPoint: (pendingPoint) => set({ pendingPoint }),
    setRetuning: (retuning) => set({ retuning }),
    setReconstructor: (gesture, id) =>
      set((state) => ({ reconstructors: { ...state.reconstructors, [gesture]: id } })),
    setReconstructParams: (patch) =>
      set((state) => ({ reconstructParams: { ...state.reconstructParams, ...patch } })),
    setStatus: (status, message = null) => set({ status, message }),
    applySculpt: (id, sculpt) => {
      const state = get();
      const target = id ? state.meshes.find((mesh) => mesh.id === id) : undefined;
      if (!target) {
        // addMesh snapshots; patching the fresh mesh's field is the same act.
        const created = state.addMesh({ geometry: sculpt.current, source: sculpt.source });
        set({
          meshes: get().meshes.map((mesh) =>
            mesh.id === created ? { ...mesh, field: sculpt.field, original: sculpt.original } : mesh,
          ),
        });
        return created;
      }
      snapshot();
      set({
        meshes: state.meshes.map((mesh) =>
          mesh.id === target.id
            ? { ...mesh, field: sculpt.field, original: sculpt.original, current: sculpt.current, simplifyRatio: 1 }
            : mesh,
        ),
        selectedId: target.id,
        status: "editing",
        message: null,
      });
      return target.id;
    },
    applyReconstruction: (id, sculpt, record) => {
      const state = get();
      const before = (id ? state.meshes.find((mesh) => mesh.id === id) : undefined) ?? null;
      const meshId = state.applySculpt(id, sculpt);
      set({ last: { ...record, id: ++reconstructionCounter, meshId, before } });
      return meshId;
    },
    retuneReconstruction: (lastId, sculpt, patch) => {
      const state = get();
      const last = state.last;
      if (!last || last.id !== lastId || !state.meshes.some((mesh) => mesh.id === last.meshId)) return false;
      set({
        meshes: state.meshes.map((mesh) =>
          mesh.id === last.meshId
            ? { ...mesh, field: sculpt.field, original: sculpt.original, current: sculpt.current, source: sculpt.source, simplifyRatio: 1 }
            : mesh,
        ),
        last: { ...last, ...patch },
        message: null,
      });
      return true;
    },
    undo: () => {
      const state = get();
      const last = state.history.at(-1);
      if (!last) return;
      set({
        history: state.history.slice(0, -1),
        future: [...state.future, { meshes: state.meshes, selectedId: state.selectedId, nextObjectId: state.nextObjectId }],
        meshes: last.meshes,
        selectedId: last.selectedId,
        nextObjectId: last.nextObjectId,
        status: last.meshes.length > 0 ? "editing" : "idle",
        message: null,
        last: null,
      });
    },
    redo: () => {
      const state = get();
      const next = state.future.at(-1);
      if (!next) return;
      set({
        future: state.future.slice(0, -1),
        history: [...state.history, { meshes: state.meshes, selectedId: state.selectedId, nextObjectId: state.nextObjectId }],
        meshes: next.meshes,
        selectedId: next.selectedId,
        nextObjectId: next.nextObjectId,
        status: next.meshes.length > 0 ? "editing" : "idle",
        message: null,
        last: null,
      });
    },
    reset: () =>
      set({
        status: "idle",
        message: null,
        meshes: [],
        selectedId: null,
        origin: null,
        nextObjectId: 1,
        history: [],
        future: [],
        last: null,
        retuning: false,
        pendingPoint: null,
      }),
    };
  });

const {
  StoreContext: MeshDesignStoreContext,
  useScopedStore: useMeshDesignStore,
  useStoreApi: useMeshDesignStoreApi,
} = createScopedStoreHooks<MeshDesignState>("MeshDesignStore");

export { MeshDesignStoreContext, useMeshDesignStore, useMeshDesignStoreApi };
