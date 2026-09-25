import { useLivekit } from "@/app/Arkitekt";
import { DisplayWidgetProps } from "@/lib/display/registry";
import {
  SoloBroadcastFragment,
  useGetSoloBroadcastQuery,
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

  return (
    <GridLayout tracks={streamer}>
      <VideoTrack trackRef={streamer.at(0)} />
    </GridLayout>
  );
}

export const VideoStream = ({ token }: { token: string }) => {
  const { url } = useLivekit();

  console.log("Stream", token, url);

  return (
    <LiveKitRoom token={token} serverUrl={url} connect={true}>
      <VideoRenderer />
    </LiveKitRoom>
  );
};

export const StreamJoiner = (props: { broadcast: SoloBroadcastFragment }) => {
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
    <div className="w-full h-full flex-grow relative flex items-center justify-center">
      {token && <VideoStream token={token} />}
    </div>
  );
};

export const SoloBroadcastDisplay = (props: DisplayWidgetProps) => {
  const { data, error } = useGetSoloBroadcastQuery({
    variables: {
      id: props.id,
    },
  });

  const broadcast = data?.soloBroadcast?.id;

  return (
    <div className="w-full h-full bg-black relative">
      {broadcast && <StreamJoiner broadcast={data.soloBroadcast} />}
      {!broadcast && (
        <div className="flex items-center justify-center h-full">
          <span className="text-white">Loading broadcast...</span>
        </div>
      )}
      {error && (
        <div className="text-red-500">
          Error loading stream: {error.message}
        </div>
      )}
    </div>
  );
};
