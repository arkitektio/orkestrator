import React from "react";
import { RekuestAgent, RekuestState } from "@/core/linkers";
import { Card } from "@/core/ui/card";
import Timestamp from "@/core/ui/timestamp";
import { cn } from "@/core/util/utils";
import type { ListStateFragment } from "@/rekuest/api/graphql";

/** A state, under the agent that keeps it; one whose agent is away steps back. */
const StateCard = ({ item }: { item: ListStateFragment }) => (
  <RekuestState.Smart object={item} menuButton>
    <Card className={cn("flex h-full flex-col gap-1.5 p-3", !item.agent.connected && "opacity-70")}>
      <RekuestState.DetailLink object={item} className="truncate text-sm font-medium hover:underline">
        {item.definition.name || item.key || item.interface}
      </RekuestState.DetailLink>
      <div className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
        <span
          className={cn("h-1.5 w-1.5 shrink-0 rounded-full", item.agent.connected ? "bg-success" : "bg-muted-foreground/50")}
          title={item.agent.connected ? "Its agent is online" : "Its agent is offline"}
        />
        <RekuestAgent.DetailLink object={item.agent} className="truncate hover:underline">
          {item.agent.name}
        </RekuestAgent.DetailLink>
      </div>
      <div className="truncate text-xs text-muted-foreground">
        Updated <Timestamp date={item.updatedAt} relative />
      </div>
    </Card>
  </RekuestState.Smart>
);

export default React.memo(StateCard);
