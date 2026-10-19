import { useLivekit } from "@/core/connection/arkitekt/host";
import { reportError } from "@/core/notify";
import { cn } from "@/core/util/utils";
import {
  SoloBroadcastFragment,
  useJoinBroadcastMutation
} from "@/lovekit/api/graphql";
import {
  AudioTrack,
  LiveKitRoom,
  useConnectionState,
  useRemoteParticipants,
  useTracks,
  VideoTrack,
} from "@livekit/components-react";
import { ConnectionState, Track } from "livekit-client";
import { Eye, Loader2, Mic, Radio, RotateCw, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { StreamerName } from "./streamer";

// The backend names the sending participant `streamer…`; everyone else in
// the room is watching.
const isStreamer = (identity: string) => identity.startsWith("streamer");

type JoinState = { status: "joining" } | { status: "failed" } | { status: "joined"; token: string };

/** A line in the middle of the player while there is no picture. */
const Placeholder = ({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) => (
  <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center text-sm text-white/70">
    <span className="flex size-12 items-center justify-center rounded-full bg-white/5 text-white/60">{icon}</span>
    {children}
  </div>
);

/** A small frosted pill on top of the video. */
const Pill = ({ className, children, title }: { className?: string; children: React.ReactNode; title?: string }) => (
  <span
    title={title}
    className={cn(
      "flex items-center gap-1.5 rounded-full bg-black/50 px-2 py-0.5 text-[11px] font-medium text-white/90 backdrop-blur",
      className,
    )}
  >
    {children}
  </span>
);

const LiveDot = () => (
  <span className="relative flex size-2">
    <span className="absolute inline-flex size-full animate-ping rounded-full bg-white/70 opacity-75" />
    <span className="relative inline-flex size-2 rounded-full bg-white" />
  </span>
);

function BroadcastStage({ broadcast, showTitle }: { broadcast: SoloBroadcastFragment; showTitle: boolean }) {
  const connection = useConnectionState();
  const tracks = useTracks([Track.Source.Camera, Track.Source.ScreenShare, Track.Source.Microphone]);
  const watchers = useRemoteParticipants().filter((p) => !isStreamer(p.identity)).length + 1;
  // Opening a page should not start talking at you: sound waits for a click.
  const [muted, setMuted] = useState(true);

  const sent = tracks.filter((t) => isStreamer(t.participant.identity));
  const video = sent.find((t) => t.source !== Track.Source.Microphone);
  const audio = sent.filter((t) => t.source === Track.Source.Microphone);
  const connected = connection === ConnectionState.Connected;

  return (
    <div className="relative h-full w-full">
      {video ? (
        <VideoTrack trackRef={video} className="h-full w-full object-contain" />
      ) : !connected ? (
        <Placeholder icon={<Loader2 className="size-5 animate-spin" />}>Connecting…</Placeholder>
      ) : audio.length > 0 ? (
        <Placeholder icon={<Mic className="size-5" />}>
          <span>Audio only</span>
        </Placeholder>
      ) : (
        <Placeholder icon={<Radio className="size-5" />}>
          <span className="flex flex-wrap items-center justify-center gap-1">
            Waiting for <StreamerName streamer={broadcast.streamer} className="font-medium text-white/90" /> to
            send video
          </span>
        </Placeholder>
      )}

      {audio.map((trackRef) => (
        <AudioTrack key={trackRef.publication.trackSid} trackRef={trackRef} muted={muted} />
      ))}

      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between gap-2 p-3">
        {connection === ConnectionState.Reconnecting || connection === ConnectionState.SignalReconnecting ? (
          <Pill>
            <Loader2 className="size-3 animate-spin" />
            Reconnecting
          </Pill>
        ) : video || audio.length > 0 ? (
          <Pill className="bg-rose-600/90">
            <LiveDot />
            LIVE
          </Pill>
        ) : (
          <span />
        )}
        {connected && (
          <Pill title={`${watchers} watching, including you`}>
            <Eye className="size-3" />
            <span className="tabular-nums">{watchers}</span>
          </Pill>
        )}
      </div>

      {(showTitle || audio.length > 0) && (
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 bg-gradient-to-t from-black/70 to-transparent p-3 pt-10">
          {showTitle ? (
            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-white">{broadcast.title || "Broadcast"}</div>
              <StreamerName streamer={broadcast.streamer} className="text-xs text-white/70" />
            </div>
          ) : (
            <span />
          )}
          {audio.length > 0 && (
            <button
              type="button"
              onClick={() => setMuted((value) => !value)}
              className="flex shrink-0 items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-xs text-white backdrop-blur transition-colors hover:bg-white/20"
            >
              {muted ? <VolumeX className="size-3.5" /> : <Volume2 className="size-3.5" />}
              {muted ? "Unmute" : "Mute"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Watches one broadcast: joins it on mount and shows the streamer's video,
 * with what state it is in (connecting, waiting, live), how many are
 * watching, and the sound behind a toggle. `showTitle` overlays who is
 * sending, for places that have no page header to say it.
 */
export const StreamJoiner = ({
  broadcast,
  showTitle = false,
  className,
}: {
  broadcast: SoloBroadcastFragment;
  showTitle?: boolean;
  className?: string;
}) => {
  const { url } = useLivekit();
  const [join] = useJoinBroadcastMutation();
  const [state, setState] = useState<JoinState>({ status: "joining" });
  const [attempt, setAttempt] = useState(0);
  // One token per broadcast and attempt, even when an effect runs twice.
  const started = useRef<string | null>(null);

  useEffect(() => {
    const key = `${broadcast.id}:${attempt}`;
    if (started.current === key) return;
    started.current = key;
    setState({ status: "joining" });
    join({ variables: { input: { broadcast: broadcast.id } } })
      .then((result) => {
        if (started.current !== key) return;
        const token = result.data?.joinBroadcast;
        setState(token ? { status: "joined", token } : { status: "failed" });
      })
      .catch((error) => {
        if (started.current !== key) return;
        setState({ status: "failed" });
        reportError(error, "Couldn't join the broadcast");
      });
  }, [broadcast.id, attempt, join]);

  return (
    <div className={cn("relative h-full w-full overflow-hidden bg-black", className)}>
      {state.status === "joined" ? (
        <LiveKitRoom token={state.token} serverUrl={url} connect={true} className="h-full w-full">
          <BroadcastStage broadcast={broadcast} showTitle={showTitle} />
        </LiveKitRoom>
      ) : state.status === "joining" ? (
        <Placeholder icon={<Loader2 className="size-5 animate-spin" />}>Joining the broadcast…</Placeholder>
      ) : (
        <Placeholder icon={<Radio className="size-5" />}>
          <span>Couldn't join the broadcast.</span>
          <button
            type="button"
            onClick={() => setAttempt((value) => value + 1)}
            className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs text-white transition-colors hover:bg-white/20"
          >
            <RotateCw className="size-3" />
            Try again
          </button>
        </Placeholder>
      )}
    </div>
  );
};
