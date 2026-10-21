import { createContext, useContext } from "react";

import type { JSONObject } from "@/core/types";

/**
 * What happened in ONE mounted scene that something beyond the drawing path
 * reacts to, published where it happens: a shape drawn. Read through
 * `sceneHost.useSceneEvents`, which also reports what the stores already
 * know (selection, probe clicks, layers).
 *
 * One emitter per `SceneProvider`, not one per scene id: two viewers of the
 * same scene (a scene page, a blok in another tab) are two scopes, and what is
 * drawn in one is not something the other did.
 *
 * An emitter rather than a store: the shape-create path runs in the hot brick
 * layers, which must not subscribe to anything, and nothing listens unless a
 * host asked, so publishing then costs a set lookup.
 */
export type SceneDrawnEvent = {
  annotation: string;
  kind: string;
  /** The shape's descriptors, when the server answered with them (a draw on a lens). */
  descriptors?: JSONObject;
  /** The lens under the probe when it was drawn. */
  lens?: string;
};

type Listener = (event: SceneDrawnEvent) => void;

export type SceneEventsApi = {
  publishDrawn: (event: SceneDrawnEvent) => void;
  subscribeDrawn: (listener: Listener) => () => void;
};

export const createSceneEvents = (): SceneEventsApi => {
  const listeners = new Set<Listener>();
  return {
    publishDrawn: (event) => {
      for (const listener of listeners) listener(event);
    },
    subscribeDrawn: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
};

export const SceneEventsContext = createContext<SceneEventsApi | null>(null);
SceneEventsContext.displayName = "SceneEventsContext";

/** The scope's emitter. Reading it subscribes to nothing, so the hot paths may. */
export const useSceneEventsApi = (): SceneEventsApi => {
  const api = useContext(SceneEventsContext);
  if (!api) throw new Error("Missing SceneProvider");
  return api;
};
