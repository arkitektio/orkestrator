import { Card, CardContent } from "@/core/ui/card";
import type { HubHealthFacts } from "@/core/connection/arkitekt/doctor/hubHealth";
import { formatDistanceToNow } from "date-fns";
import { Radio } from "lucide-react";
import { StatusLabel, type Tone } from "./StatusLabel";

/**
 * What the hub last told the coordination server about itself. The
 * per-service half of its report sits on each `ServiceCard`, next to what
 * this computer sees.
 */
export const HubHealthCard = ({ hub }: { hub: HubHealthFacts }) => {
  const reported = !!hub.lastSeenAt;
  const status: { label: string; tone: Tone } = !reported
    ? { label: "Never reported", tone: "muted" }
    : !hub.online
      ? { label: "Not reporting", tone: "bad" }
      : hub.lastHealthy === false
        ? { label: "Reports problems", tone: "warn" }
        : { label: "Healthy", tone: "good" };

  const facts = [
    reported
      ? `last report ${formatDistanceToNow(new Date(hub.lastSeenAt!), { addSuffix: true })}`
      : "has never reported its health to the coordination server",
    hub.version && `version ${hub.version}`,
    hub.meshConnected === true && (hub.meshHost ? `on the mesh as ${hub.meshHost}` : "on the mesh"),
    hub.meshConnected === false && "not on the mesh",
  ].filter(Boolean);

  return (
    <Card className="gap-0 py-0">
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
          <Radio className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-medium">{hub.name}</span>
            <StatusLabel tone={status.tone}>{status.label}</StatusLabel>
          </div>
          <div className="truncate text-xs text-muted-foreground">{facts.join(" · ")}</div>
        </div>
      </CardContent>
    </Card>
  );
};
