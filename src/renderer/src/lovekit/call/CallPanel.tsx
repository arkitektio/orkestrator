import { StatusPage } from "@/core/layout/fallbacks/StatusPage";
import { Button } from "@/core/ui/button";
import { Spinner } from "@/core/ui/spinner";
import { useElementSize } from "@/core/util/useElementSize";
import { cn } from "@/core/util/utils";
import { type CallFragment, useCallParticipantsQuery } from "@/lovekit/api/graphql";
import { RoomContext, useTracks } from "@livekit/components-react";
import { Track } from "livekit-client";
import { AlertCircle, Phone, Users } from "lucide-react";

import { CallControls } from "./CallControls";
import { CallDock } from "./CallDock";
import { CallDropTarget } from "./CallDropTarget";
import { ParticipantTile } from "./ParticipantTile";
import { stageLayout, stageRowWidth } from "./stageLayout";
import { useCallState } from "./store";
import { useJoinCall } from "./useJoinCall";

/**
 * Everyone in the room, one tile each, plus every shared screen, in the rows
 * and columns that suit the stage's shape (`stageLayout`): the tiles are as
 * large as fit, whole, and centred.
 */
const Stage = () => {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false },
  );
  const { ref, size } = useElementSize<HTMLDivElement>();
  const layout = stageLayout(tracks.length, size.width, size.height);

  return (
    <div ref={ref} className="flex min-h-0 flex-1 items-center justify-center overflow-hidden p-2" data-testid="call-stage">
      {/* Held to one row's width, so a row is exactly `columns` tiles and a
          last row that is not full sits centred under the others. */}
      {layout && (
        <div
          className="flex shrink-0 flex-wrap content-center justify-center gap-2"
          style={{ width: stageRowWidth(layout) }}
          data-columns={layout.columns}
        >
          {tracks.map((trackRef) => (
            <ParticipantTile
              key={`${trackRef.participant.identity}-${trackRef.source}`}
              trackRef={trackRef}
              className="shrink-0"
              style={{ width: layout.tileWidth, height: layout.tileHeight }}
            />
          ))}
        </div>
      )}
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
 * does not hang up. Under them, in every state, the dock: what the call is
 * talking about and, once in it, the buttons. Dropping an object on the
 * panel turns the call to it.
 */
export const CallPanel = ({ call, className }: { call: CallFragment; className?: string }) => {
  const active = useCallState((state) => state.call);
  const status = useCallState((state) => state.status);
  const room = useCallState((state) => state.room);
  const error = useCallState((state) => state.error);
  const { join, joining } = useJoinCall();
  const inThisCall = active?.id === call.id;
  // The room, once this window is connected to this call.
  const live = inThisCall && status === "connected" ? room : null;

  return (
    <CallDropTarget call={call} className={cn("flex min-h-0 flex-1 flex-col", className)} testId="call-panel">
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
      ) : live ? (
        <RoomContext.Provider value={live}>
          <Stage />
        </RoomContext.Provider>
      ) : inThisCall ? (
        <div className="flex flex-1 items-center justify-center gap-2 text-sm text-muted-foreground">
          <Spinner className="size-4" /> Connecting…
        </div>
      ) : (
        <Lobby call={call} />
      )}
      {/* One dock for every state, so joining brings the buttons in beside
          the topic instead of redrawing it. */}
      <CallDock call={call}>
        {live && (
          <RoomContext.Provider value={live}>
            <CallControls />
          </RoomContext.Provider>
        )}
      </CallDock>
    </CallDropTarget>
  );
};
