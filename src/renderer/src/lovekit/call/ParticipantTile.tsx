import { cn } from "@/core/util/utils";
import {
  isTrackReference,
  useIsMuted,
  useIsSpeaking,
  useTracks,
  VideoTrack,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import { MicOff } from "lucide-react";

/** One entry of `useTracks` with placeholders: a participant, with or without video. */
export type TileRef = ReturnType<typeof useTracks<{ source: Track.Source; withPlaceholder: boolean }[]>>[number];

const initials = (name: string) =>
  name
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "?";

/**
 * One participant: their camera when it is on, their initials when it is
 * not. A ring lights while they speak; a struck mic says they are muted.
 * Built from LiveKit's hooks and our own styles, not the prebuilt tile, so
 * it needs no stylesheet of LiveKit's.
 */
export const ParticipantTile = ({
  trackRef,
  className,
  style,
}: {
  trackRef: TileRef;
  className?: string;
  /** The tile's size, from whoever lays the tiles out (`stageLayout`). */
  style?: React.CSSProperties;
}) => {
  const { participant } = trackRef;
  const speaking = useIsSpeaking(participant);
  const micMuted = useIsMuted({ participant, source: Track.Source.Microphone });
  const video = isTrackReference(trackRef) && !trackRef.publication.isMuted;
  const name = participant.name || participant.identity;
  const screen = trackRef.source === Track.Source.ScreenShare;

  return (
    <div
      className={cn(
        "relative flex min-h-0 min-w-0 items-center justify-center overflow-hidden rounded-xl bg-muted/60 ring-2 ring-transparent transition-shadow",
        speaking && "ring-primary/70",
        className,
      )}
      style={style}
      data-testid="call-participant"
    >
      {video ? (
        <VideoTrack
          trackRef={trackRef}
          className={cn("h-full w-full", screen ? "object-contain" : "object-cover")}
        />
      ) : (
        <div className="flex size-16 items-center justify-center rounded-full bg-primary/15 text-xl font-semibold text-primary">
          {initials(name)}
        </div>
      )}
      <div className="absolute bottom-2 left-2 flex max-w-[calc(100%-1rem)] items-center gap-1 rounded-md bg-background/80 px-1.5 py-0.5 text-xs backdrop-blur">
        <span className="truncate">
          {name}
          {participant.isLocal && " (you)"}
          {screen && " · screen"}
        </span>
        {micMuted && !screen && <MicOff className="size-3 shrink-0 text-muted-foreground" />}
      </div>
    </div>
  );
};
