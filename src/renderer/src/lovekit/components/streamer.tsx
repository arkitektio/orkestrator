import { StructureDisplay } from "@/core/smart/display/StructureDisplay";
import { cn } from "@/core/util/utils";
import { Mic, Video } from "lucide-react";
import { StreamKind, StreamerFragment } from "../api/graphql";

/** Video or audio, as an icon. */
export const StreamKindIcon = ({ kind, className }: { kind: StreamKind; className?: string }) => {
  const Icon = kind === StreamKind.Audio ? Mic : Video;
  return <Icon className={cn("size-3.5 shrink-0", className)} aria-hidden />;
};

export const streamKindLabel = (kind: StreamKind) => (kind === StreamKind.Audio ? "Audio" : "Video");

/** The person sending: lok's avatar and name, their username until it loads. */
export const StreamerName = ({ streamer, className }: { streamer: StreamerFragment; className?: string }) => (
  <span className={cn("flex min-w-0 items-center gap-1.5", className)}>
    <StructureDisplay identifier="@lok/user" id={streamer.user.sub} variant="avatar" className="size-4" />
    <span className="truncate">
      <StructureDisplay
        identifier="@lok/user"
        id={streamer.user.sub}
        variant="inline"
        fallback={streamer.user.preferredUsername}
      />
    </span>
  </span>
);

/** The app the streamer sends from, with its version when it has a release. */
export const StreamerApp = ({ streamer, className }: { streamer: StreamerFragment; className?: string }) => {
  const release = streamer.client.release;
  return (
    <span className={cn("flex min-w-0 items-center gap-1", className)}>
      <span className="truncate" title={release?.app.identifier ?? streamer.client.clientId}>
        {release?.app.identifier ?? streamer.client.clientId}
      </span>
      {release && <span className="shrink-0 tabular-nums">{release.version}</span>}
    </span>
  );
};
