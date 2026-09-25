import { createStore } from "zustand/vanilla";
import { createScopedStoreHooks } from "@/lib/generic/createScopedStore";
import { eraseNearPolyline, mergeGeometry, type Vec3 } from "../ops/sculpt";
import type { SculptField } from "../field/sculptField";

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
   * The sculpting field the strokes accumulate into (`sculptField.ts`).
   * Null until the first sculpt op; built lazily from `original` then.
   */
  field: SculptField | null;
};

export type DesignStatus = "idle" | "editing" | "baking" | "uploading" | "committing" | "error";

export type StampShape = "sphere" | "box" | "ellipsoid";
export type SculptVariant = "inflate" | "deflate" | "smooth";

export type DesignOrigin = {
  collectionId: string;
  version: string;
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

  /** Add a mesh; returns its session id. `objectId` is assigned unless given. */
  addMesh: (mesh: {
    name?: string;
    geometry: DesignGeometry;
    source: DesignMeshSource;
    objectId?: number;
  }) => string;
  /**
   * Brush ADD: append a stroke's surface to mesh `id`, or to a new mesh when
   * `id` is null / unknown. Returns the mesh that received it. Appending
   * resets any simplification — it always restarts from the full geometry.
   */
  appendGeometry: (id: string | null, geometry: DesignGeometry, source: DesignMeshSource) => string;
  /** Brush ERASE: drop the triangles within `radius` of the stroke from mesh `id`. */
  eraseFromMesh: (id: string, stroke: readonly Vec3[], radius: number) => void;
  /** Start an empty mesh and select it — the next C/V stroke goes there. */
  newMesh: () => string;
  /**
   * A sculpt landed: the mesh's new field and geometry in one step. Null
   * `id` (or an unknown one) starts a new mesh. Returns the mesh id.
   */
  applySculpt: (
    id: string | null,
    sculpt: { field: SculptField; original: DesignGeometry; current: DesignGeometry; source: DesignMeshSource },
  ) => string;
  undo: () => void;
  redo: () => void;
  setStampShape: (shape: StampShape) => void;
  setSculptVariant: (variant: SculptVariant) => void;
  setPendingPoint: (point: { world: Vec3; voxel: Vec3 } | null) => void;
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

export const createMeshDesignStore = () =>
  createStore<MeshDesignState>()((set, get) => {
    /** Push the current meshes onto the undo stack; a new act clears redo. */
    const snapshot = () => {
      const state = get();
      set({
        history: [
          ...state.history.slice(-(UNDO_DEPTH - 1)),
          { meshes: state.meshes, selectedId: state.selectedId, nextObjectId: state.nextObjectId },
        ],
        future: [],
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
    appendGeometry: (id, geometry, source) => {
      snapshot();
      const state = get();
      const target = id ? state.meshes.find((mesh) => mesh.id === id) : undefined;
      if (!target) return state.addMesh({ geometry, source });
      const merged = mergeGeometry(target.original, geometry);
      set({
        meshes: state.meshes.map((mesh) =>
          mesh.id === target.id ? { ...mesh, original: merged, current: merged, simplifyRatio: 1 } : mesh,
        ),
        selectedId: target.id,
        status: "editing",
        message: null,
      });
      return target.id;
    },
    eraseFromMesh: (id, stroke, radius) => {
      snapshot();
      set((state) => ({
        meshes: state.meshes.map((mesh) => {
          if (mesh.id !== id) return mesh;
          const original = eraseNearPolyline(mesh.original, stroke, radius);
          if (original === mesh.original) return mesh;
          return { ...mesh, original, current: original, simplifyRatio: 1 };
        }),
      }));
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
      }),
    };
  });

const {
  StoreContext: MeshDesignStoreContext,
  useScopedStore: useMeshDesignStore,
  useStoreApi: useMeshDesignStoreApi,
} = createScopedStoreHooks<MeshDesignState>("MeshDesignStore");

export { MeshDesignStoreContext, useMeshDesignStore, useMeshDesignStoreApi };
