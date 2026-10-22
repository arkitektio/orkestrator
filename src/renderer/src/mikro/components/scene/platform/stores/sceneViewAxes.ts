import { create } from "zustand";
import { IDENTITY_VIEW, type ViewAxes } from "@/core/data/scene/coords/viewAxes";

/**
 * Which world axis each screen axis shows, per scene, for this session only.
 *
 * Outside the scene scope on purpose: every layer's axes and lattice are
 * derived from the view, so changing it REBUILDS the scope (`SceneProvider`),
 * and state kept inside the scope would be rebuilt away with it. Module-level
 * so leaving a scene and coming back keeps the plane it was looked at in.
 */
const useViewAxesStore = create<{
  byScene: Record<string, ViewAxes>;
  set: (sceneId: string, view: ViewAxes) => void;
}>((set) => ({
  byScene: {},
  set: (sceneId, view) => set((state) => ({ byScene: { ...state.byScene, [sceneId]: view } })),
}));

export const useSceneViewAxes = (sceneId: string | null | undefined): ViewAxes =>
  useViewAxesStore((state) => (sceneId ? state.byScene[sceneId] : undefined) ?? IDENTITY_VIEW);

export const useSetSceneViewAxes = () => useViewAxesStore((state) => state.set);
