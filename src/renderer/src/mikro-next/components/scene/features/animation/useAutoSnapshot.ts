import { useEffect, useRef } from "react";

import { useSettings } from "@/providers/settings/SettingsContext";
import { cameraInteraction } from "../../platform/camera/cameraMotion";
import { AUTO_SNAPSHOT_QUIET_MS, decideAutoSnapshot } from "./autoSnapshotGate";
import { useSceneStore, useSceneStoreApi } from "../../platform/stores/sceneStore";
import { useViewerStore } from "../../platform/stores/viewerStore";
import { useSceneSnapshot } from "./useAnimationEditor";

/**
 * Give a scene its thumbnail the first time anyone opens it.
 *
 * `Scene.latestSnapshot` is the tile that `SceneCard`, `SnapshotBackdrop`,
 * `HoverShell` and the dashboard widgets all paint, but until now the only
 * thing that ever produced one was `savePreferredView` — so a scene got a
 * picture only if someone happened to change how it opens, and the card grid
 * was a wall of black tiles.
 *
 * Deliberately narrow. It fires at most once per mount, and only when:
 *
 * - the scene has NO picture yet. This fills a gap; it never refreshes, so it
 *   can never overwrite a shot someone composed on purpose.
 * - the image has settled (`sharp`), so the tile is not a blurry half-streamed
 *   pyramid.
 * - the camera has not been touched, so the tile is the default fit-to-scene
 *   rig. Tiles then look consistent across the grid instead of freezing
 *   whatever angle the first visitor happened to drag to.
 * - the user has left the setting on.
 *
 * Best-effort throughout, because `useSceneSnapshot` is: it resolves either
 * way and only logs. A missing tile is cosmetic, and nothing on this page is
 * allowed to fail because a PNG upload did.
 */
export const useAutoSceneSnapshot = (): void => {
  const { settings } = useSettings();
  const enabled = settings.autoSceneSnapshot;

  const hasSnapshot = useSceneStore((s) => s.hasSnapshot);
  // `layers` is the scene's BRICK layers specifically — an empty list means
  // no brick pipeline will run, so there is no drained edge to wait for.
  const hasVolumetricLayers = useSceneStore((s) => s.layers.length > 0);
  const sceneStoreApi = useSceneStoreApi();
  const sharp = useViewerStore((s) => s.sharp);
  const captureSnapshot = useSceneSnapshot();

  // One attempt per mount. A ref rather than store state because a second
  // attempt is never WANTED — not even after a failure, where a retry loop on
  // a broken datalayer would upload on every settle. Same shape as
  // `UiCatalogRegistrar`'s `attemptedRef`.
  const attemptedRef = useRef(false);
  // The camera-gesture count at mount. Anything higher later means the user
  // took hold of the view, so the default rig is gone.
  const markRef = useRef(cameraInteraction.count());

  useEffect(() => {
    const action = decideAutoSnapshot({
      enabled,
      hasSnapshot,
      attempted: attemptedRef.current,
      sharp,
      hasVolumetricLayers,
      cameraTouched: cameraInteraction.count() !== markRef.current,
    });
    if (action === "skip") return;

    const shoot = () => {
      // Re-decide rather than trusting the render that scheduled this: on the
      // quiet path seconds may have passed, and the user may have grabbed the
      // camera or another mount may have taken the picture meanwhile.
      const now = decideAutoSnapshot({
        enabled,
        hasSnapshot: sceneStoreApi.getState().hasSnapshot,
        attempted: attemptedRef.current,
        sharp,
        hasVolumetricLayers,
        cameraTouched: cameraInteraction.count() !== markRef.current,
      });
      if (now === "skip") return;
      attemptedRef.current = true;
      void captureSnapshot().then((id) => {
        // Flip the store so nothing in this session tries again, and so a
        // panel reading `hasSnapshot` reflects the new picture.
        if (id) sceneStoreApi.getState().markSnapshotTaken();
      });
    };

    if (action === "shoot") {
      shoot();
      return;
    }

    // `wait-quiet`: nothing volumetric ever started. Wait out the window and
    // take whatever is on screen.
    const timer = setTimeout(shoot, AUTO_SNAPSHOT_QUIET_MS);
    return () => clearTimeout(timer);
  }, [enabled, hasSnapshot, sharp, hasVolumetricLayers, captureSnapshot, sceneStoreApi]);
};

/**
 * Mount point for `useAutoSceneSnapshot`.
 *
 * Renders null and lives in HTML world, not inside `<Canvas>` — the hook needs
 * Apollo and the settings context, and R3F runs its own reconciler where those
 * providers do not reach.
 */
export const SceneAutoSnapshot = () => {
  useAutoSceneSnapshot();
  return null;
};
