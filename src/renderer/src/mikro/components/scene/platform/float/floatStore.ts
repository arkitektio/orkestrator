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
  /**
   * The owner of the open float that holds STAGED layers, or null. While one
   * holds, a click that would replace or close it is deferred (`guard`) and
   * the float asks to keep or discard them first.
   */
  hold: string | null;
  setHold: (owner: string | null) => void;
  /** Release the hold only if `owner` still has it (a float unmounting). */
  releaseHold: (owner: string) => void;
  /** A deferred click, waiting for the holding float's answer. */
  pendingSwitch: (() => void) | null;
  /**
   * Run a click that opens `owner`'s float now, or defer it while another
   * float holds staged layers. `closesHolder`: the click closes the holding
   * float itself (a re-click that deselects its object).
   */
  guard: (owner: string, run: () => void, options?: { closesHolder?: boolean }) => void;
  /**
   * Take the deferred click (clearing it): the holding float runs it once its
   * staged layers are kept or discarded, or drops it on Cancel.
   */
  takePending: () => (() => void) | null;
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
    hold: null,
    setHold: (owner) => {
      if (get().hold !== owner) set({ hold: owner, pendingSwitch: null });
    },
    releaseHold: (owner) => {
      if (get().hold === owner) set({ hold: null, pendingSwitch: null });
    },
    pendingSwitch: null,
    guard: (owner, run, options) => {
      const hold = get().hold;
      if (hold && (hold !== owner || options?.closesHolder)) {
        set({ pendingSwitch: run });
        return;
      }
      run();
    },
    takePending: () => {
      const pending = get().pendingSwitch;
      if (pending) set({ pendingSwitch: null });
      return pending;
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
