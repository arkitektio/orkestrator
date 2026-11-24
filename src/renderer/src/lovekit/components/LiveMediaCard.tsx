import { useEffect, useState } from "react";
import { RoomEvent, Track, type Participant, type RemoteTrack, type Room } from "livekit-client";
import { useStore } from "zustand";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/core/ui/card";
import { cn } from "@/core/util/utils";
import { agentRooms } from "../agentRoom";
import { useCallMediaPath } from "../call/CallConnection";
import { useCallState } from "../call/store";
import { describeMediaPath } from "../mediaStats";
import { useMediaServerTunnel, useMediaStats, usePublisherPath } from "../useMediaStats";

const TONE_TEXT = { good: "text-success", warn: "text-warning", bad: "text-destructive", muted: "text-muted-foreground" };

/** The tracks this window receives in a room, kept current as they come and go. */
const useReceivedTracks = (room: Room) => {
  const read = () =>
    [...room.remoteParticipants.values()].flatMap((participant) =>
      [...participant.trackPublications.values()]
        .filter((publication) => publication.isSubscribed && publication.track)
        .map((publication) => ({
          participant: participant.identity,
          publisher: participant as Participant,
          name: publication.trackName,
          track: publication.track as RemoteTrack,
        })),
    );
  const [tracks, setTracks] = useState(read);
  useEffect(() => {
    const update = () => setTracks(read());
    const events = [RoomEvent.TrackSubscribed, RoomEvent.TrackUnsubscribed, RoomEvent.ParticipantDisconnected];
    for (const event of events) room.on(event, update);
    update();
    return () => {
      for (const event of events) room.off(event, update);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room]);
  return tracks;
};

/** One received track: how it travels, and what arrives. */
const TrackRow = ({
  name,
  participant,
  publisher,
  track,
  room,
}: {
  name: string;
  participant: string;
  publisher: Participant;
  track: RemoteTrack;
  room: Room;
}) => {
  const { stats, kbps } = useMediaStats(track);
  const agent = usePublisherPath(room, publisher, stats?.rttMs ?? null);
  const mesh = useMediaServerTunnel();
  const path = describeMediaPath(stats, mesh);
  const video = stats?.video;
  const numbers = [
    track.kind === Track.Kind.Audio ? "audio" : null,
    video?.width && video.height ? `${video.width}×${video.height}` : null,
    video?.fps != null ? `${Math.round(video.fps)} fps` : null,
    kbps != null ? `${Math.round(kbps)} kbps` : null,
    video?.packetsLost ? `${video.packetsLost} packets lost` : null,
    stats?.rttMs != null ? `${Math.round(stats.rttMs)} ms round trip` : null,
  ].filter(Boolean);
  return (
    <div className="space-y-0.5 py-2 text-sm" data-testid="live-media-track">
      <div className="flex items-baseline gap-2">
        <span className="font-medium">{name || "track"}</span>
        <span className="truncate text-xs text-muted-foreground">from {participant}</span>
      </div>
      <div className={cn("text-xs", TONE_TEXT[path.tone])}>This window → server · {path.line}</div>
      {numbers.length > 0 && <div className="text-xs text-muted-foreground">{numbers.join(" · ")}</div>}
      {agent && <div className={cn("text-xs", TONE_TEXT[agent.tone])}>{agent.line}</div>}
    </div>
  );
};

const RoomBlock = ({ title, room, via }: { title: string; room: Room; via: string }) => {
  const tracks = useReceivedTracks(room);
  return (
    <div className="py-2">
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="font-medium">{title}</span>
        <span className="text-xs text-muted-foreground">{via}</span>
      </div>
      {tracks.length === 0 ? (
        <p className="py-1 text-xs text-muted-foreground">Joined; nothing received yet.</p>
      ) : (
        <div className="divide-y">
          {tracks.map((received) => (
            <TrackRow key={`${received.participant}/${received.name}`} {...received} room={room} />
          ))}
        </div>
      )}
    </div>
  );
};

const viaOf = (path: { kind: "direct" } | { kind: "media-bridge"; meshLabel: string } | null) =>
  !path ? "joining" : path.kind === "media-bridge" ? `through the ${path.meshLabel} mesh's media bridge` : "straight to the media server";

/**
 * Settings → Connection: the live media this window receives (streams of agents, a call), how
 * each travels and how well. Live media is UDP only: straight to the media server, or through
 * the mesh's media bridge when the server is only on the mesh.
 */
export const LiveMediaCard = () => {
  const rooms = useStore(agentRooms, (state) => state.rooms);
  const callRoom = useCallState((state) => state.room);
  const callPath = useCallMediaPath();
  const joined = Object.entries(rooms).filter(([, entry]) => entry.room);
  const failed = Object.entries(rooms).filter(([, entry]) => entry.status === "error");

  return (
    <Card data-testid="live-media-card">
      <CardHeader>
        <CardTitle>Live media</CardTitle>
        <CardDescription>
          Camera streams and calls this window receives, and how they travel. Live media goes over
          UDP: straight to the media server, or through the mesh&apos;s media bridge when the server
          is only on the mesh.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {joined.length === 0 && !callRoom && failed.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing live right now. Open a stream or a call to see how it travels.</p>
        ) : (
          <div className="divide-y">
            {callRoom && (
              <RoomBlock
                title="Call"
                room={callRoom}
                via={viaOf(callPath && (callPath.kind === "media-bridge" ? { kind: "media-bridge", meshLabel: callPath.meshLabel } : { kind: "direct" }))}
              />
            )}
            {joined.map(([agentId, entry]) => (
              <RoomBlock key={agentId} title={`Streams of agent ${agentId}`} room={entry.room!} via={viaOf(entry.path)} />
            ))}
            {failed.map(([agentId, entry]) => (
              <div key={agentId} className="py-2 text-sm">
                <span className="font-medium">Streams of agent {agentId}</span>
                <p className="text-xs text-destructive">{entry.error}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
