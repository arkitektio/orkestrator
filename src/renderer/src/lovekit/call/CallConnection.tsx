import { Guard, useLivekit } from "@/core/connection/arkitekt/host";
import { LiveKitRoom, RoomAudioRenderer, useRoomContext } from "@livekit/components-react";
import { useEffect, useState } from "react";
import { createStore, useStore } from "zustand";
import { mediaPathFor, type MediaPath } from "@/core/connection/mesh/mediaBridge";

import { callStore, useCallState } from "./store";

/** Hands the connected `Room` to the store, for the page and the island. */
const RoomBridge = () => {
  const room = useRoomContext();
  useEffect(() => {
    callStore.getState().setRoom(room);
    return () => callStore.getState().setRoom(null);
  }, [room]);
  return null;
};

/** How the call's media reaches LiveKit, for the Live media status (null while not joined). */
export const callMediaPath = createStore<{ path: MediaPath | null }>(() => ({ path: null }));
export const useCallMediaPath = () => useStore(callMediaPath, (state) => state.path);

const Connection = () => {
  const { url } = useLivekit();
  const token = useCallState((state) => state.token);
  const callId = useCallState((state) => state.call?.id);
  // Through the mesh's media bridge when LiveKit is only on the mesh: asked before joining.
  const [path, setPath] = useState<MediaPath | null>(null);
  useEffect(() => {
    if (!token || !callId) return undefined;
    let current = true;
    mediaPathFor(url).then(
      (found) => {
        if (!current) return;
        setPath(found);
        callMediaPath.setState({ path: found });
      },
      (error: unknown) => {
        if (current) callStore.getState().fail(error instanceof Error ? error.message : String(error));
      },
    );
    return () => {
      current = false;
      setPath(null);
      callMediaPath.setState({ path: null });
    };
  }, [url, token, callId]);
  if (!token || !callId || !path) return null;

  return (
    // Keyed by call: joining another call remounts the connection rather
    // than re-pointing the old one.
    <LiveKitRoom
      key={callId}
      token={token}
      serverUrl={url}
      connectOptions={path.kind === "media-bridge" ? { rtcConfig: path.rtcConfig } : undefined}
      connect
      audio
      video
      onConnected={() => callStore.getState().connected()}
      onDisconnected={() => {
        // Only the call this connection carries: `start` of another call has
        // already replaced the state by the time the old room reports.
        if (callStore.getState().call?.id === callId) callStore.getState().leave();
      }}
      onError={(error) => callStore.getState().fail(error.message)}
    >
      {/* Everyone else's audio plays from here, wherever the user is in the app. */}
      <RoomAudioRenderer />
      <RoomBridge />
    </LiveKitRoom>
  );
};

/**
 * The call's LiveKit connection: a `background` builtin, so it is mounted as
 * long as lovekit is up and a call outlives the page it was joined from.
 * Renders nothing; the call page and the rail island are its views.
 *
 * Inside the host's LiveKit guard too: `useLivekit` reads the media server
 * the deployment configured, which lovekit requires but does not own.
 */
export const CallConnection = () => (
  <Guard.Livekit fallback={null}>
    <Connection />
  </Guard.Livekit>
);
