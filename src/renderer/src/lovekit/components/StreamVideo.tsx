import { useMemo } from "react";
import { AudioTrack, useTracks, VideoTrack } from "@livekit/components-react";
import { Track, type Room } from "livekit-client";
import { Loader2, Mic, VideoOff } from "lucide-react";

import { Guard, useLivekit } from "@/core/connection/arkitekt/host";
import { cn } from "@/core/util/utils";
import { StreamKind, useWatchAgentMutation } from "../api/graphql";
import { useAgentRoom, useWatchedTrack, type Connector } from "../agentRoom";

/** What a view needs of a stream to show it. */
export type ShownStream = {
  key: string;
  title: string;
  kind: StreamKind;
  live?: boolean | null;
  agent: { id: string };
};

/** How this window joins agent rooms: the deployment's LiveKit, and a `watchAgent` token. */
const useConnector = (): Connector => {
  const { url } = useLivekit();
  const [watchAgent] = useWatchAgentMutation();
  return useMemo(
    () => ({
      url,
      token: async (agent: string) => {
        const result = await watchAgent({ variables: { input: { agent } } });
        const token = result.data?.watchAgent;
        if (!token) throw new Error("lovekit handed out no token");
        return token;
      },
    }),
    [url, watchAgent],
  );
};

const Notice = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn("flex h-full w-full flex-col items-center justify-center gap-2 bg-black text-sm text-white/60", className)}>
    {children}
  </div>
);

/** The stream's track in the joined room, or why there is none. */
const PublishedTrack = ({ room, stream, className }: { room: Room; stream: ShownStream; className?: string }) => {
  const sources = stream.kind === StreamKind.Audio ? [Track.Source.Microphone] : [Track.Source.Camera];
  const tracks = useTracks(sources, { room, onlySubscribed: true });
  const track = tracks.find((reference) => reference.publication?.trackName === stream.key);

  if (!track) {
    return (
      <Notice className={className}>
        <VideoOff className="size-5" />
        <span>{stream.live === false ? `${stream.title} is offline` : `Waiting for ${stream.title}…`}</span>
      </Notice>
    );
  }
  if (stream.kind === StreamKind.Audio) {
    return (
      <Notice className={className}>
        <Mic className="size-5 text-emerald-400" />
        <span>{stream.title}</span>
        <AudioTrack trackRef={track} />
      </Notice>
    );
  }
  return <VideoTrack trackRef={track} className={cn("h-full w-full bg-black object-contain", className)} />;
};

const Connected = ({ stream, className }: { stream: ShownStream; className?: string }) => {
  const connector = useConnector();
  const room = useAgentRoom(stream.agent.id, connector);
  useWatchedTrack(stream.agent.id, stream.key);

  if (!room?.room) {
    return (
      <Notice className={className}>
        <Loader2 className="size-5 animate-spin" />
        {room?.status === "error" && <span className="px-4 text-center text-xs">Couldn't join: {room.error}. Trying again…</span>}
      </Notice>
    );
  }
  return <PublishedTrack room={room.room} stream={stream} className={className} />;
};

/**
 * One stream, live: the track named by its key in its agent's room. Every
 * view of the same agent shares one connection (`agentRoom`), and only the
 * tracks on screen are subscribed. Behind the host's LiveKit guard: lovekit
 * mints the tokens, the deployment's media server carries the stream.
 */
export const StreamVideo = ({ stream, className }: { stream: ShownStream; className?: string }) => (
  <Guard.Livekit fallback={<Notice className={className}>No media server is configured.</Notice>}>
    <Connected stream={stream} className={className} />
  </Guard.Livekit>
);
