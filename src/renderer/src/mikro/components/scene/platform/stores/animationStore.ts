import { createStore } from "zustand/vanilla";
import { immer } from "zustand/middleware/immer";

import { Easing } from "@/mikro/api/graphql";
import type { AnimationFragment, CameraStateFragment, SceneFragment } from "@/mikro/api/graphql";
import { tourDurationMs } from "../camera/animation";
import type { SceneCameraFrame } from "../camera/cameraState";
import { createScopedStoreHooks } from "@/core/util/createScopedStore";

/**
 * The scene's camera tours: the saved ones, the one playing, and the one being
 * authored.
 *
 * `animations` is seeded from the scene fragment and patched from mutation
 * results, the same shape `sceneStore` uses for layers — the scene's stores are
 * built once per scope and never rehydrate from a refetch, so a tour saved
 * mid-session has to land here to be visible without a reload. (`sceneStore`
 * is the one exception: its LAYER set is reconciled in place, because layers
 * arrive dynamically. Nothing here does — every animation mutation folds its
 * own result.)
 */

/** A stop being authored: no id yet, and `key` is only for React/reordering. */
export type DraftWaypoint = {
  key: string;
  name: string;
  /** Travel time TO this stop. Ignored for the first, which is the start. */
  durationMs: number;
  easing: Easing;
  camera: CameraStateFragment;
};

export const DEFAULT_WAYPOINT_DURATION_MS = 1500;

export interface AnimationStoreState {
  /**
   * How a pose maps to three-space, resolved once from the scene's world
   * system and layers. Held here so neither the player nor the panel has to
   * re-derive it (or know that it is reference-layer based at all).
   */
  frame: SceneCameraFrame;

  animations: AnimationFragment[];
  setAnimations: (animations: AnimationFragment[]) => void;
  upsertAnimation: (animation: AnimationFragment) => void;
  removeAnimation: (id: string) => void;

  /** The tour playing right now; null when idle. */
  playingId: string | null;
  loop: boolean;
  elapsedMs: number;
  play: (id: string, options?: { loop?: boolean }) => void;
  /** Takes effect immediately, including on a tour already playing. */
  setLoop: (loop: boolean) => void;
  stop: () => void;
  seek: (ms: number) => void;
  /** Advance the clock; ends (or wraps) the tour when it runs out. */
  advance: (deltaMs: number) => void;

  /** The tour being re-authored, or null when the draft is a new tour. */
  editingId: string | null;
  draft: DraftWaypoint[];
  loadDraft: (animation: AnimationFragment | null) => void;
  clearDraft: () => void;
  addDraftWaypoint: (camera: CameraStateFragment, name?: string) => void;
  updateDraftWaypoint: (key: string, patch: Partial<Omit<DraftWaypoint, "key">>) => void;
  removeDraftWaypoint: (key: string) => void;
  /** Move a stop one place earlier (-1) or later (+1). */
  moveDraftWaypoint: (key: string, direction: -1 | 1) => void;
}

let draftKeySeq = 0;
const nextDraftKey = () => `draft-${draftKeySeq++}`;

export const createAnimationStore = ({
  scene,
  frame,
}: {
  scene: SceneFragment;
  frame: SceneCameraFrame;
}) =>
  createStore<AnimationStoreState>()(
    immer((set, get) => ({
      frame,
      animations: scene.animations ?? [],

      setAnimations: (animations) =>
        set((state) => {
          state.animations = animations;
        }),
      upsertAnimation: (animation) =>
        set((state) => {
          const index = state.animations.findIndex((a) => a.id === animation.id);
          if (index === -1) state.animations.push(animation);
          else state.animations[index] = animation;
        }),
      removeAnimation: (id) =>
        set((state) => {
          state.animations = state.animations.filter((a) => a.id !== id);
          // A tour cannot keep playing once it is gone.
          if (state.playingId === id) {
            state.playingId = null;
            state.elapsedMs = 0;
          }
          if (state.editingId === id) state.editingId = null;
        }),

      playingId: null,
      loop: false,
      elapsedMs: 0,
      play: (id, options) =>
        set((state) => {
          state.playingId = id;
          state.loop = options?.loop ?? state.loop;
          state.elapsedMs = 0;
        }),
      setLoop: (loop) =>
        set((state) => {
          state.loop = loop;
        }),
      stop: () =>
        set((state) => {
          state.playingId = null;
          state.elapsedMs = 0;
        }),
      seek: (ms) =>
        set((state) => {
          state.elapsedMs = Math.max(0, ms);
        }),
      advance: (deltaMs) => {
        const { playingId, animations, loop, elapsedMs } = get();
        if (!playingId) return;
        const animation = animations.find((a) => a.id === playingId);
        if (!animation) return;
        const total = tourDurationMs(animation.waypoints);
        const next = elapsedMs + deltaMs;
        set((state) => {
          // A tour with no travel (one stop, or all-zero legs) would loop
          // forever at 0 — hold the pose and end instead of dividing by it.
          if (total <= 0) {
            state.elapsedMs = 0;
            state.playingId = null;
            return;
          }
          if (next < total) {
            state.elapsedMs = next;
            return;
          }
          if (loop) {
            state.elapsedMs = next % total;
            return;
          }
          // Settle exactly on the final pose rather than wherever the last
          // frame's delta overshot to.
          state.elapsedMs = total;
          state.playingId = null;
        });
      },

      editingId: null,
      draft: [],
      loadDraft: (animation) =>
        set((state) => {
          state.editingId = animation?.id ?? null;
          state.draft = animation
            ? [...animation.waypoints]
                .sort((a, b) => a.order - b.order)
                .map((waypoint) => ({
                  key: nextDraftKey(),
                  name: waypoint.name,
                  durationMs: waypoint.durationMs,
                  easing: waypoint.easing,
                  camera: waypoint.camera,
                }))
            : [];
        }),
      clearDraft: () =>
        set((state) => {
          state.draft = [];
          state.editingId = null;
        }),
      addDraftWaypoint: (camera, name) =>
        set((state) => {
          state.draft.push({
            key: nextDraftKey(),
            name: name ?? `Stop ${state.draft.length + 1}`,
            durationMs: DEFAULT_WAYPOINT_DURATION_MS,
            easing: Easing.EaseInOut,
            camera,
          });
        }),
      updateDraftWaypoint: (key, patch) =>
        set((state) => {
          const waypoint = state.draft.find((w) => w.key === key);
          if (waypoint) Object.assign(waypoint, patch);
        }),
      removeDraftWaypoint: (key) =>
        set((state) => {
          state.draft = state.draft.filter((w) => w.key !== key);
        }),
      moveDraftWaypoint: (key, direction) =>
        set((state) => {
          const index = state.draft.findIndex((w) => w.key === key);
          const target = index + direction;
          if (index === -1 || target < 0 || target >= state.draft.length) return;
          const [moved] = state.draft.splice(index, 1);
          state.draft.splice(target, 0, moved);
        }),
    })),
  );

const {
  StoreContext: AnimationStoreContext,
  useScopedStore: useAnimationStore,
  useStoreApi: useAnimationStoreApi,
} = createScopedStoreHooks<AnimationStoreState>("AnimationStore");

export { AnimationStoreContext, useAnimationStore, useAnimationStoreApi };
