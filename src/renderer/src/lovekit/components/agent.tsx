import { StructureDisplay } from "@/core/smart/display/StructureDisplay";
import { cn } from "@/core/util/utils";
import { Mic, Video } from "lucide-react";
import { AgentOwnerFragment, StreamKind } from "../api/graphql";

/** Video or audio, as an icon. */
export const StreamKindIcon = ({ kind, className }: { kind: StreamKind; className?: string }) => {
  const Icon = kind === StreamKind.Audio ? Mic : Video;
  return <Icon className={cn("size-3.5 shrink-0", className)} aria-hidden />;
};

export const streamKindLabel = (kind: StreamKind) => (kind === StreamKind.Audio ? "Audio" : "Video");

/** The person the agent runs for: lok's avatar and name, their username until it loads. */
export const AgentUser = ({ agent, className }: { agent: AgentOwnerFragment; className?: string }) => (
  <span className={cn("flex min-w-0 items-center gap-1.5", className)}>
    <StructureDisplay identifier="@lok/user" id={agent.user.sub} variant="avatar" className="size-4" />
    <span className="truncate">
      <StructureDisplay identifier="@lok/user" id={agent.user.sub} variant="inline" fallback={agent.user.preferredUsername} />
    </span>
  </span>
);

/** The app the agent is, with its version when it has a release. */
export const AgentApp = ({ agent, className }: { agent: AgentOwnerFragment; className?: string }) => {
  const release = agent.client.release;
  return (
    <span className={cn("flex min-w-0 items-center gap-1", className)}>
      <span className="truncate" title={release?.app.identifier ?? agent.client.clientId}>
        {release?.app.identifier ?? agent.name}
      </span>
      {release && <span className="shrink-0 tabular-nums">{release.version}</span>}
    </span>
  );
};

/** A dot that is green while it is live. */
export const LiveDot = ({ live, className }: { live: boolean; className?: string }) => (
  <span className={cn("relative flex size-2 shrink-0", className)} title={live ? "Live" : "Offline"}>
    {live && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />}
    <span className={cn("relative inline-flex size-2 rounded-full", live ? "bg-emerald-500" : "bg-muted-foreground/40")} />
  </span>
);
