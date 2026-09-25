import {
  HoverRow,
  HoverSectionLabel,
  HoverShell,
  HoverSkeleton,
} from "@/core/components/hover/HoverShell";
import { Badge } from "@/core/components/ui/badge";
import { Object } from "@/core/types";
import { formatDistanceToNow } from "date-fns";
import { Zap } from "lucide-react";
import { RekuestAction } from "@/core/linkers";
import { useHoverAgentQuery } from "../../api/graphql";

export const AgentHoverCard = ({ object }: { object: Object }) => {
  const { data, error } = useHoverAgentQuery({
    variables: { id: object.id },
    fetchPolicy: "cache-first",
  });

  if (error) {
    return (
      <div className="p-3 text-xs text-destructive">
        Could not load agent details.
      </div>
    );
  }

  if (!data) {
    return <HoverSkeleton />;
  }

  const agent = data.agent;

  return (
    <HoverShell
      title={agent.name || agent.app.identifier}
      subtitle={`${agent.app.identifier} · v${agent.release.version}`}
    >
      <div className="flex flex-row flex-wrap gap-1">
        <Badge
          variant={agent.active ? "default" : "secondary"}
          className="text-[10px]"
        >
          {agent.active ? "active" : "inactive"}
        </Badge>
        <Badge
          variant={agent.connected ? "default" : "secondary"}
          className="text-[10px]"
        >
          {agent.connected ? "connected" : "disconnected"}
        </Badge>
        {agent.pinned && (
          <Badge variant="secondary" className="text-[10px]">
            pinned
          </Badge>
        )}
        {agent.blocked && (
          <Badge variant="destructive" className="text-[10px]">
            blocked
          </Badge>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <HoverRow label="User" value={agent.user.sub} />
        {agent.lastSeen && (
          <HoverRow
            label="Last seen"
            value={formatDistanceToNow(new Date(agent.lastSeen), {
              addSuffix: true,
            })}
          />
        )}
        {agent.latestHardwareRecord && (
          <HoverRow
            label="CPU"
            value={`${agent.latestHardwareRecord.cpuCount}× ${agent.latestHardwareRecord.cpuVendorName}`}
          />
        )}
      </div>

      {agent.implementations.length > 0 && (
        <div className="flex flex-col gap-1">
          <HoverSectionLabel>Provides</HoverSectionLabel>
          <div className="flex flex-col gap-0.5">
            {agent.implementations.slice(0, 6).map((impl) => (
              <RekuestAction.DetailLink
                key={impl.id}
                object={impl.action}
                className="flex flex-row items-center gap-2 text-xs rounded px-1 py-0.5 hover:bg-muted transition-colors"
              >
                <Zap className="h-3 w-3 shrink-0 text-muted-foreground" />
                <span className="line-clamp-1">{impl.action.name}</span>
              </RekuestAction.DetailLink>
            ))}
          </div>
        </div>
      )}
    </HoverShell>
  );
};

export default AgentHoverCard;
