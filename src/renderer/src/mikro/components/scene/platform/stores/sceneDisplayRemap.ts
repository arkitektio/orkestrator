import { create } from "zustand";
import { isRemapActive, type DisplayRemap } from "../model/displayRemap";

/**
 * The display remap (`platform/model/displayRemap.ts`), per scene, for this
 * session only — never saved, so nobody opening the scene meets a distorted
 * view they did not ask for.
 *
 * Outside the scene scope for the same reason as `sceneViewAxes.ts`: a view
 * change REBUILDS the scope, and state kept inside it would be rebuilt away.
 * `DisplayRemapSync` pushes it into whichever scene store is current.
 */
const useDisplayRemapStore = create<{
  byScene: Record<string, DisplayRemap | null>;
  set: (sceneId: string, remap: DisplayRemap | null) => void;
}>((set) => ({
  byScene: {},
  set: (sceneId, remap) => set((state) => ({ byScene: { ...state.byScene, [sceneId]: remap } })),
}));

export const useSceneDisplayRemap = (sceneId: string | null | undefined): DisplayRemap | null =>
  useDisplayRemapStore((state) => (sceneId ? state.byScene[sceneId] : undefined) ?? null);

export const useSetSceneDisplayRemap = () => useDisplayRemapStore((state) => state.set);

/** True while the scene is drawn non-physically: writes in world units are off. */
export const useDisplayRemapActive = (sceneId: string | null | undefined): boolean =>
  useDisplayRemapStore((state) => isRemapActive(sceneId ? state.byScene[sceneId] : null));

/** Non-hook read, for callbacks that run outside render. */
export const readSceneDisplayRemap = (sceneId: string | null | undefined): DisplayRemap | null =>
  (sceneId ? useDisplayRemapStore.getState().byScene[sceneId] : null) ?? null;

/** The sentence every write refused under a remap shows. */
export const REMAP_BLOCK_REASON =
  "The scene is drawn with an axis remap. Set it back to 1× (Scene settings) to save positions.";
