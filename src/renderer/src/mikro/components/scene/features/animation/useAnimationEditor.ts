import { useCallback } from "react";

import {
  useCreateAnimationMutation,
  useCreateSceneSnapshotMutation,
  useDeleteAnimationMutation,
  useUpdateAnimationMutation,
  useUpdateSceneMutation,
} from "@/mikro/api/graphql";
import type { PreferredView } from "@/mikro/api/graphql";
import { useDatalayerEndpoint } from "@/core/lib/arkitekt/host";
import { useMikro } from "@/mikro/api/funcs";
import { serializeWaypoint } from "../../platform/camera/animation";
import { captureCameraState } from "../../platform/camera/cameraState";
import { uploadMediaBlob } from "../../platform/sources/mediaUpload";
import { useAnimationStoreApi } from "../../platform/stores/animationStore";
import { useModeStoreApi } from "../../platform/stores/modeStore";
import { useSceneStore } from "../../platform/stores/sceneStore";
import { useViewerStoreApi } from "../../platform/stores/viewerStore";

/**
 * The write path for tours and scene preferences.
 *
 * Same shape as `useRenderGraphEditor` (`features/volume/rendergraph/RenderNodeEditor.tsx`):
 * mutate, then fold the server's answer back into the scene's store — the
 * stores are built once at mount and never rehydrate, so anything saved
 * mid-session has to land locally to be visible without a reload.
 */

export interface AnimationEditor {
  saving: boolean;
  /** Append a stop at the live camera. */
  captureWaypoint: () => void;
  /** Save the draft: creates a new tour, or re-authors the one being edited. */
  saveDraft: (name: string, description?: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

export const useAnimationEditor = (): AnimationEditor => {
  const sceneId = useSceneStore((s) => s.id);
  const animationApi = useAnimationStoreApi();
  const modeApi = useModeStoreApi();
  const viewerApi = useViewerStoreApi();

  const [createAnimation, { loading: creating }] = useCreateAnimationMutation();
  const [updateAnimation, { loading: updating }] = useUpdateAnimationMutation();
  const [deleteAnimation, { loading: deleting }] = useDeleteAnimationMutation();

  const captureWaypoint = useCallback(() => {
    const { frame, addDraftWaypoint } = animationApi.getState();
    const viewer = viewerApi.getState();
    const canvas = viewer.canvas;
    // No canvas means the scene has not finished mounting — there is no pose
    // to capture yet, and inventing one would record the default rig.
    if (!canvas) return;

    addDraftWaypoint(
      captureCameraState(
        { camera: canvas.camera, controls: canvas.controls, size: canvas.size },
        modeApi.getState().displayMode,
        frame,
        { dimSelections: viewer.dimSelections, currentZ: viewer.currentZ },
      ),
    );
  }, [animationApi, modeApi, viewerApi]);

  const saveDraft = useCallback(
    async (name: string, description?: string) => {
      const { draft, editingId, upsertAnimation, clearDraft } = animationApi.getState();
      if (draft.length === 0) return;
      const waypoints = draft.map(serializeWaypoint);

      if (editingId) {
        const result = await updateAnimation({
          variables: { id: editingId, name, description, waypoints },
        });
        if (result.data?.updateAnimation) upsertAnimation(result.data.updateAnimation);
      } else {
        const result = await createAnimation({
          variables: { scene: sceneId, name, description, waypoints },
        });
        if (result.data?.createAnimation) upsertAnimation(result.data.createAnimation);
      }
      clearDraft();
    },
    [animationApi, createAnimation, updateAnimation, sceneId],
  );

  const remove = useCallback(
    async (id: string) => {
      await deleteAnimation({ variables: { id } });
      animationApi.getState().removeAnimation(id);
    },
    [animationApi, deleteAnimation],
  );

  return { saving: creating || updating || deleting, captureWaypoint, saveDraft, remove };
};

/**
 * Push the current canvas to the backend as the scene's latest snapshot — the
 * tile that represents the composition without loading its layers.
 *
 * Best-effort by construction: it resolves either way and only logs, because
 * every caller runs it alongside something that actually matters. A scene with
 * a stale tile is a cosmetic problem; a preference that failed to save because
 * a PNG upload did is not.
 */
export const useSceneSnapshot = (): (() => Promise<string | null>) => {
  const sceneId = useSceneStore((s) => s.id);
  const client = useMikro();
  const datalayer = useDatalayerEndpoint();
  const viewerApi = useViewerStoreApi();
  const [createSceneSnapshot] = useCreateSceneSnapshotMutation();

  return useCallback(async () => {
    const capture = viewerApi.getState().captureScreenshot;
    // Null until SceneScreenshot registers it from inside the Canvas — i.e. the
    // scene has not painted yet, so there is no picture to take.
    if (!capture || !datalayer) return null;

    try {
      const blob = await capture();
      if (!blob) return null;
      const file = await uploadMediaBlob(client, datalayer, blob, `scene-${sceneId}.png`);
      const result = await createSceneSnapshot({ variables: { scene: sceneId, file } });
      return result.data?.createSceneSnapshot?.id ?? null;
    } catch (error) {
      console.error("[scene] snapshot failed", error);
      return null;
    }
  }, [sceneId, client, datalayer, viewerApi, createSceneSnapshot]);
};

export interface ScenePreferencesEditor {
  saving: boolean;
  savePreferredView: (view: PreferredView) => Promise<void>;
  saveBackgroundColor: (color: number[] | null) => Promise<void>;
}

/**
 * The scene's viewer preferences.
 *
 * Both fields are optional server-side and omitting one leaves it untouched,
 * so each setter sends only its own field — a background save must not quietly
 * restate (and pin) the preferred view.
 */
export const useScenePreferencesEditor = (): ScenePreferencesEditor => {
  const sceneId = useSceneStore((s) => s.id);
  const setPreferredView = useSceneStore((s) => s.setPreferredView);
  const [updateScene, { loading }] = useUpdateSceneMutation();
  const captureSnapshot = useSceneSnapshot();

  const savePreferredView = useCallback(
    async (preferredView: PreferredView) => {
      const result = await updateScene({ variables: { id: sceneId, preferredView } });
      // Take the server's answer, not the argument: the store should say what
      // the scene says, and only a round-trip proves that.
      const saved = result.data?.updateScene?.preferredView;
      if (saved) setPreferredView(saved);
      // Refresh the scene's tile to match what was just pinned. Best-effort and
      // deliberately after the preference: the picture is a nicety, the
      // preference is the intent, and an S3 hiccup must not lose it.
      await captureSnapshot();
    },
    [sceneId, updateScene, setPreferredView, captureSnapshot],
  );

  const saveBackgroundColor = useCallback(
    async (backgroundColor: number[] | null) => {
      await updateScene({ variables: { id: sceneId, backgroundColor } });
    },
    [sceneId, updateScene],
  );

  return { saving: loading, savePreferredView, saveBackgroundColor };
};
