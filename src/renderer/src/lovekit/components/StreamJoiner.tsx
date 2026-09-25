import { useLivekit } from "@/core/connection/arkitekt/host";
import {
  SoloBroadcastFragment,
  useJoinBroadcastMutation
} from "@/lovekit/api/graphql";
import {
  GridLayout,
  LiveKitRoom,
  useTracks,
  VideoTrack,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import { useEffect, useRef, useState } from "react";


function VideoRenderer() {
  const trackRefs = useTracks([Track.Source.Camera]);

  const streamer = trackRefs.filter((t) =>
    t.participant.identity.startsWith("streamer"),
  );

  const trackRef = streamer.at(0);

  if (!trackRef) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-white/80">
        Waiting for broadcast...
      </div>
    );
  }

  return (
    <GridLayout
      tracks={streamer}
      className="h-full w-full [&_.lk-participant-media-video]:h-full [&_.lk-participant-media-video]:w-full [&_.lk-participant-media-video]:object-cover [&_video]:h-full [&_video]:w-full [&_video]:object-cover"
    >
      <VideoTrack trackRef={trackRef} />
    </GridLayout>
  );
}

export const VideoStream = ({ token }: { token: string }) => {
  const { url } = useLivekit();

  console.log("Stream", token, url);

  return (
    <LiveKitRoom
      token={token}
      serverUrl={url}
      connect={true}
      className="h-full w-full"
    >
      <VideoRenderer />
    </LiveKitRoom>
  );
};

export const StreamJoiner = (props: {
  broadcast: SoloBroadcastFragment;
}) => {
  const [token, setToken] = useState<string | null>(null);
  const tokenFutureRan = useRef<boolean>(false);

  const [x] = useJoinBroadcastMutation();

  useEffect(() => {
    if (!tokenFutureRan.current) {
      tokenFutureRan.current = true;
      x({
        variables: {
          input: { broadcast: props.broadcast.id },
        },
      }).then((result) => {
        if (result.data?.joinBroadcast) {
          setToken(result.data.joinBroadcast);
        }
      });
    }
  }, [props.broadcast.id, x]);

  return (
    <div className="relative flex h-full w-full flex-grow items-center justify-center">
      {token && <VideoStream token={token} />}
    </div>
  );
};
