import { useContext } from "react";
import { createStore } from "zustand/vanilla";
import { createScopedStoreHooks } from "@/core/util/createScopedStore";

/**
 * Which object's float is open, for the floats that are not an annotation's.
 *
 * An annotation's float still opens from `roiSelectionStore.menuRoi` (a click
 * on the shape, a draw); a mesh object's opens from here. Only one float is
 * open at a time: opening one closes the other (the mesh click closes the
 * annotation menu, and the mesh float closes when a shape's menu opens).
 *
 * Lives for the SCENE, not the store scope: the scope is rebuilt on a view
 * switch (XY → XZ), and a float the user is working in must survive that.
 * Holds ids only, so nothing in it goes stale across a rebuild.
 */
export type FloatTarget = {
  kind: "mesh";
  layerId: string;
  /** The dense per-vertex ordinal the click picked. */
  ordinal: number;
};

export interface SceneFloatState {
  target: FloatTarget | null;
  open: (target: FloatTarget) => void;
  /** Close; with `target`, only if that is still the one open. */
  close: (target?: FloatTarget) => void;
}

/** The owner key of an annotation's float. */
export const annotationFloatOwner = (id: string) => `annotation:${id}`;
/** The owner key of a mesh object's float. */
export const meshFloatOwner = (target: { layerId: string; ordinal: number }) => `mesh:${target.layerId}:${target.ordinal}`;

export const sameFloatTarget = (a: FloatTarget | null, b: FloatTarget | null): boolean =>
  a === b || (!!a && !!b && a.kind === b.kind && a.layerId === b.layerId && a.ordinal === b.ordinal);

export const createSceneFloatStore = () =>
  createStore<SceneFloatState>()((set, get) => ({
    target: null,
    open: (target) => {
      if (sameFloatTarget(get().target, target)) return;
      set({ target });
    },
    close: (target) => {
      if (target && !sameFloatTarget(get().target, target)) return;
      if (get().target !== null) set({ target: null });
    },
  }));

const {
  StoreContext: SceneFloatStoreContext,
  useScopedStore: useSceneFloatStore,
  useStoreApi: useSceneFloatStoreApi,
} = createScopedStoreHooks<SceneFloatState>("SceneFloatStore");

export { SceneFloatStoreContext, useSceneFloatStore, useSceneFloatStoreApi };

/**
 * The store, or null outside a `SceneProvider`: for the pickers that also
 * mount in hosts without floats (fixtures, tests), which then open none.
 */
export const useOptionalSceneFloatStoreApi = () => useContext(SceneFloatStoreContext);
