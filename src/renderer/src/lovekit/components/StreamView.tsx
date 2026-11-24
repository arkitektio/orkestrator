import { useMemo, useRef } from "react";
import type { Participant, Track as LivekitTrack } from "livekit-client";
import { useDebugMode } from "@/core/debug/DebugContext";
import { AudioTrack, useTracks, VideoTrack, type TrackReference } from "@livekit/components-react";
import { Track, type Room } from "livekit-client";
import { Loader2, Mic, VideoOff } from "lucide-react";

import { Guard, useLivekit } from "@/core/connection/arkitekt/host";
import { cn } from "@/core/util/utils";
import { StreamKind, useWatchAgentMutation, type DataFormatFragment } from "../api/graphql";
import { mediaPathFor } from "@/core/connection/mesh/mediaBridge";
import { useAgentRoom, useWatchedTrack, type Connector } from "../agentRoom";
import { StreamPlot } from "./StreamPlot";
import { describeMediaPath } from "../mediaStats";
import { useMediaServerTunnel, useMediaStats, usePictureHealth, usePublisherPath } from "../useMediaStats";

/** What a view needs of a stream to show it. */
export type ShownStream = {
  key: string;
  title: string;
  kind: StreamKind;
  live?: boolean | null;
  format?: DataFormatFragment | null;
  agent: { id: string };
};

/** How this window joins agent rooms: the deployment's LiveKit, and a `watchAgent` connection. */
const useConnector = (): Connector => {
  const { url } = useLivekit();
  const [watchAgent] = useWatchAgentMutation();
  return useMemo(
    () => ({
      url,
      // Through the mesh's media bridge when LiveKit is only on the mesh.
      mediaPath: () => mediaPathFor(url),
      connect: async (agent: string) => {
        const result = await watchAgent({ variables: { input: { agent } } });
        const connection = result.data?.watchAgent;
        if (!connection) throw new Error("lovekit handed out no connection");
        return connection;
      },
    }),
    [url, watchAgent],
  );
};

const Notice = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn("dark flex h-full w-full flex-col items-center justify-center gap-2 bg-background text-sm text-foreground/60", className)}>
    {children}
  </div>
);

/** The stream in the joined room, as its kind is shown. */
const Published = ({ room, stream, className }: { room: Room; stream: ShownStream; className?: string }) => {
  switch (stream.kind) {
    case StreamKind.Data:
      if (!stream.format) return <Notice className={className}>{stream.title} declares no format.</Notice>;
      return <StreamPlot room={room} stream={{ ...stream, format: stream.format }} className={className} />;
    case StreamKind.Audio:
    case StreamKind.Video:
      return <PublishedTrack room={room} stream={stream} className={className} />;
    default:
      return <Notice className={className}>This Orkestrator cannot show a {String(stream.kind).toLowerCase()} stream.</Notice>;
  }
};

/** The media track of a video or audio stream, or why there is none. */
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
        <Mic className="size-5 text-success" />
        <span>{stream.title}</span>
        <AudioTrack trackRef={track} />
      </Notice>
    );
  }
  return <ShownVideo room={room} track={track} className={className} />;
};

const TONE_TEXT = { good: "text-success", warn: "text-warning", bad: "text-destructive", muted: "text-white/60" };

/**
 * Debug mode, over a video: how its media travels (UDP or TCP, direct or the mesh's media
 * bridge, the mesh tunnel under it), what arrives (size, frames, bits, losses) and whether
 * the picture says anything (a flat frame is a camera that sends nothing).
 */
const MediaDebugOverlay = ({
  track,
  publisher,
  room,
  container,
}: {
  track: LivekitTrack | undefined;
  publisher: Participant | undefined;
  room: Room;
  container: React.RefObject<HTMLDivElement | null>;
}) => {
  const { stats, kbps } = useMediaStats(track);
  const agent = usePublisherPath(room, publisher, stats?.rttMs ?? null);
  const mesh = useMediaServerTunnel();
  const health = usePictureHealth(container, true);
  const path = describeMediaPath(stats, mesh);
  const video = stats?.video;
  const numbers = [
    video?.width && video.height ? `${video.width}×${video.height}` : null,
    video?.fps != null ? `${Math.round(video.fps)} fps` : null,
    kbps != null ? `${Math.round(kbps)} kbps` : null,
    video?.packetsLost ? `${video.packetsLost} lost` : null,
    video?.framesDropped ? `${video.framesDropped} dropped` : null,
    stats?.rttMs != null ? `${Math.round(stats.rttMs)} ms` : null,
  ].filter(Boolean);
  return (
    <div
      data-testid="media-debug-overlay"
      className="dark pointer-events-none absolute left-2 top-2 max-w-[90%] space-y-0.5 rounded-md bg-black/70 px-2 py-1 font-mono text-[10px] leading-snug text-white"
    >
      <div className={TONE_TEXT[path.tone]}>This window → server · {path.line}</div>
      {numbers.length > 0 && <div className="text-white/70">{numbers.join(" · ")}</div>}
      {agent && <div className={TONE_TEXT[agent.tone]}>{agent.line}</div>}
      {health?.flat && <div className="text-warning">{health.message}</div>}
    </div>
  );
};

/** A video stream's picture, with the debug overlay in debug mode. */
const ShownVideo = ({ room, track, className }: { room: Room; track: TrackReference; className?: string }) => {
  const debug = useDebugMode();
  const container = useRef<HTMLDivElement>(null);
  return (
    <div ref={container} className={cn("relative h-full w-full", className)}>
      <VideoTrack trackRef={track} className="dark h-full w-full bg-background object-contain" />
      {debug && (
        <MediaDebugOverlay track={track.publication?.track} publisher={track.participant} room={room} container={container} />
      )}
    </div>
  );
};

const Connected = ({ stream, className }: { stream: ShownStream; className?: string }) => {
  const connector = useConnector();
  const room = useAgentRoom(stream.agent.id, connector);
  // A data stream's track is read by its plot; only media tracks are subscribed here.
  useWatchedTrack(stream.agent.id, stream.kind === StreamKind.Data ? undefined : stream.key);

  if (!room?.room) {
    return (
      <Notice className={className}>
        <Loader2 className="size-5 animate-spin" />
        {room?.status === "error" && <span className="px-4 text-center text-xs">Couldn't join: {room.error}. Trying again…</span>}
      </Notice>
    );
  }
  return <Published room={room.room} stream={stream} className={className} />;
};

/**
 * One stream, live, whatever it carries: the track named by its key in its
 * agent's room, as a picture, a sound or a plot. Every view of the same agent
 * shares one connection (`agentRoom`), and only the tracks on screen are
 * subscribed. Behind the host's LiveKit guard: lovekit hands out the
 * connections, the deployment's media server carries the stream.
 */
export const StreamView = ({ stream, className }: { stream: ShownStream; className?: string }) => (
  <Guard.Livekit fallback={<Notice className={className}>No media server is configured.</Notice>}>
    <Connected stream={stream} className={className} />
  </Guard.Livekit>
);
