import { coveringMesh } from "@/core/connection/arkitekt/doctor/diagnose";
import type { MeshStatusPayload } from "../../../../../main/mesh/protocol";
import { meshBridge } from "./bridge";
import { meshStatusStore } from "./meshStatusStore";

/**
 * How live media (WebRTC, LiveKit) reaches a media server: straight there over UDP, or through
 * the mesh's media bridge when the server is only on the mesh. The window's WebRTC cannot use
 * the mesh's HTTP proxy, so for a server on the mesh it is handed the bridge (a TURN server on
 * 127.0.0.1 whose traffic goes over the mesh) as its ICE server. WebRTC keeps its own direct
 * candidates too: where a direct UDP path works it is used, the bridge where it does not.
 *
 * Live media is UDP only (no TCP fallback): a window that cannot reach the media server over
 * UDP goes through the mesh, which falls back to TCP on its own ("routed via <region>").
 */
export type MediaPath =
  | { kind: "direct" }
  | { kind: "media-bridge"; meshId: string; meshLabel: string; rtcConfig: RTCConfiguration };

/** The mesh a media server is reached through, if any. */
export const meshFor = (payload: MeshStatusPayload | undefined, url: string) => {
  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    return undefined;
  }
  const mesh = coveringMesh(payload, host);
  return mesh ? { mesh, host } : undefined;
};

/** Asks in flight, so views joining at once share one. The sidecar keeps one bridge per mesh
 *  and answers every ask with it, so nothing is kept here past the answer: after a mesh restart
 *  the next ask gets the new bridge. */
const asking = new Map<string, Promise<MediaPath>>();

/** Why live media from a mesh-only server cannot be had in this window, as a sentence. */
export class MediaBridgeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MediaBridgeError";
  }
}

/**
 * The path to take to the media server at `url` (its LiveKit address). Throws a
 * `MediaBridgeError` when the server is on the mesh and no bridge can be had: without one this
 * window has no way to it.
 */
export const mediaPathFor = (url: string): Promise<MediaPath> => {
  const store = meshStatusStore();
  const found = meshFor(store.getSnapshot().payload, url);
  if (!found) return Promise.resolve({ kind: "direct" });
  const { mesh, host } = found;
  const key = `${mesh.config.id}|${host}`;
  const inFlight = asking.get(key);
  if (inFlight) return inFlight;

  const ask = (async (): Promise<MediaPath> => {
    const bridge = meshBridge();
    if (!bridge?.mediaBridge) {
      throw new MediaBridgeError(
        `Live media from this hub goes through the ${mesh.config.label} mesh, and this Orkestrator has no media bridge (update it).`,
      );
    }
    const result = await bridge.mediaBridge({ meshId: mesh.config.id, allow: [host] });
    if (!result.ok) {
      throw new MediaBridgeError(
        `Live media from this hub goes through the ${mesh.config.label} mesh, and its media bridge could not start: ${result.error}.`,
      );
    }
    return {
      kind: "media-bridge",
      meshId: mesh.config.id,
      meshLabel: mesh.config.label,
      rtcConfig: {
        iceServers: [{ urls: result.urls, username: result.username, credential: result.credential }],
        // WebRTC still offers its direct candidates: a direct UDP path wins where there is one.
        iceTransportPolicy: "all",
      },
    };
  })();
  asking.set(key, ask);
  const done = () => {
    if (asking.get(key) === ask) asking.delete(key);
  };
  ask.then(done, done);
  return ask;
};
