import { createContext, useContext } from "react";

import { createCameraInteraction, type CameraInteraction } from "../camera/cameraMotion";
import { createPressLedger, type PressLedger } from "./pressLedger";

/**
 * What ONE mounted scene knows about the pointer, for its whole life: the
 * press ledger (`pressLedger.ts`: whose press, was it a click, that it ended)
 * and whether a gesture is driving the camera (`camera/cameraMotion.ts`).
 *
 * One per `SceneProvider`, like the scene's events: two viewers of the same
 * scene are two canvases with two pointers' worth of state. Plain objects,
 * not stores — both are written per pointer event and read with a call, and
 * nothing renders from them (P17).
 */
export type SceneInput = {
  press: PressLedger;
  camera: CameraInteraction;
};

export const createSceneInput = (): SceneInput => ({
  press: createPressLedger(),
  camera: createCameraInteraction(),
});

export const SceneInputContext = createContext<SceneInput | null>(null);
SceneInputContext.displayName = "SceneInputContext";

const useSceneInput = (): SceneInput => {
  const input = useContext(SceneInputContext);
  if (!input) throw new Error("Missing SceneProvider");
  return input;
};

/**
 * A tool's press is in flight: a shape being dragged, a stroke being painted,
 * a marquee. While it is, streaming steps aside — no stream-only volume
 * re-render, uploads at a trickle — so the press is not starved of frames by
 * the load going on behind it (`VolumeCompositor`, the brick upload drain).
 * A camera press is not this: `viewStore.cameraMoving` already covers it.
 */
export const toolPressOpen = (ledger: PressLedger): boolean =>
  ledger.current()?.owner === "tool";

/** The scene's press ledger. Reading it subscribes to nothing, so the hot paths may. */
export const usePressLedger = (): PressLedger => useSceneInput().press;

/** Whether a gesture is driving this scene's camera. */
export const useCameraInteraction = (): CameraInteraction => useSceneInput().camera;
