import { StatusPage } from "@/core/layout/fallbacks/StatusPage";
import { Button } from "@/core/ui/button";
import { Spinner } from "@/core/ui/spinner";
import { cn } from "@/core/util/utils";
import { type CallFragment, useCallParticipantsQuery } from "@/lovekit/api/graphql";
import { RoomContext, useTracks } from "@livekit/components-react";
import { Track } from "livekit-client";
import { AlertCircle, Phone, Users } from "lucide-react";

import { CallControls } from "./CallControls";
import { ParticipantTile } from "./ParticipantTile";
import { useCallState } from "./store";
import { useJoinCall } from "./useJoinCall";

/** How many columns a grid of `n` tiles gets: 1, 2, then 3. */
const columns = (n: number) => (n <= 1 ? 1 : n <= 4 ? 2 : 3);

/** Everyone in the room, one tile each, plus every shared screen. */
const Stage = () => {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false },
  );
  return (
    <div
      className="grid min-h-0 flex-1 gap-2 p-2"
      style={{ gridTemplateColumns: `repeat(${columns(tracks.length)}, minmax(0, 1fr))` }}
      data-testid="call-stage"
    >
      {tracks.map((trackRef) => (
        <ParticipantTile
          key={`${trackRef.participant.identity}-${trackRef.source}`}
          trackRef={trackRef}
          className="aspect-video"
        />
      ))}
    </div>
  );
};

/** Who is in the call now, asked of lovekit while this window is not. */
const Lobby = ({ call }: { call: CallFragment }) => {
  const { join, joining, error, active } = useJoinCall();
  const { data } = useCallParticipantsQuery({
    variables: { id: call.id },
    pollInterval: 10_000,
    fetchPolicy: "cache-and-network",
  });
  const participants = data?.call.participants ?? call.participants;
  // One person may be in from two devices; they are one name with a count.
  const devices = new Map<string, number>();
  for (const p of participants) {
    const name = p.name || p.identity;
    devices.set(name, (devices.get(name) ?? 0) + 1);
  }
  const names = [...devices].map(([name, n]) => (n > 1 ? `${name} (${n} devices)` : name));

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
        {names.length > 0 ? <Users className="size-6" /> : <Phone className="size-6" />}
      </div>
      <div>
        <p className="font-medium">{call.title}</p>
        <p className="text-sm text-muted-foreground">
          {names.length === 0
            ? "Nobody is in the call yet"
            : names.length === 1
              ? `${names[0]} is in the call`
              : `${names.length} in the call: ${names.join(", ")}`}
        </p>
      </div>
      <Button onClick={() => void join({ id: call.id, title: call.title })} disabled={joining} data-testid="call-join">
        {joining ? <Spinner className="size-3.5" /> : <Phone />}
        {active && active.id !== call.id ? `Leave "${active.title}" and join` : "Join call"}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
};

/**
 * The call: tiles and controls once this window is in it, the lobby with a
 * Join button until then. The connection itself is `CallConnection`'s; this
 * only renders its room through LiveKit's `RoomContext`, so leaving the page
 * does not hang up.
 */
export const CallPanel = ({ call, className }: { call: CallFragment; className?: string }) => {
  const active = useCallState((state) => state.call);
  const status = useCallState((state) => state.status);
  const room = useCallState((state) => state.room);
  const error = useCallState((state) => state.error);
  const { join, joining } = useJoinCall();
  const inThisCall = active?.id === call.id;

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", className)} data-testid="call-panel">
      {inThisCall && status === "error" ? (
        <StatusPage
          variant="compact"
          icon={AlertCircle}
          tone="destructive"
          title="The call dropped"
          description={error}
          actions={
            <Button onClick={() => void join({ id: call.id, title: call.title })} disabled={joining}>
              Rejoin
            </Button>
          }
        />
      ) : inThisCall && room && status === "connected" ? (
        <RoomContext.Provider value={room}>
          <Stage />
          <CallControls />
        </RoomContext.Provider>
      ) : inThisCall ? (
        <div className="flex flex-1 items-center justify-center gap-2 text-sm text-muted-foreground">
          <Spinner className="size-4" /> Connecting…
        </div>
      ) : (
        <Lobby call={call} />
      )}
    </div>
  );
};
