import { Guard, useLivekit } from "@/core/connection/arkitekt/host";
import { LiveKitRoom, RoomAudioRenderer, useRoomContext } from "@livekit/components-react";
import { useEffect } from "react";

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

const Connection = () => {
  const { url } = useLivekit();
  const token = useCallState((state) => state.token);
  const callId = useCallState((state) => state.call?.id);
  if (!token || !callId) return null;

  return (
    // Keyed by call: joining another call remounts the connection rather
    // than re-pointing the old one.
    <LiveKitRoom
      key={callId}
      token={token}
      serverUrl={url}
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
