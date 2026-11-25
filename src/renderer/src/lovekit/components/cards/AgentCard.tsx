import React from "react";
import { LovekitAgent } from "@/core/linkers";
import { StructureDisplay } from "@/core/smart/display/StructureDisplay";
import { Card } from "@/core/ui/card";
import { cn } from "@/core/util/utils";
import type { ListAgentFragment } from "@/lovekit/api/graphql";

const TheCard = ({ item }: { item: ListAgentFragment }) => (
  <LovekitAgent.Smart object={item} menuButton>
    <Card className={cn("flex h-full flex-col gap-1.5 p-3", !item.live && "opacity-70")}>
      <div className="flex min-w-0 items-center gap-2">
        <span
          className={cn("h-1.5 w-1.5 shrink-0 rounded-full", item.live ? "bg-success" : "bg-muted-foreground/50")}
          title={item.live ? "Live" : "Not live"}
        />
        <LovekitAgent.DetailLink object={item} className="truncate text-sm font-medium hover:underline">
          {item.name}
        </LovekitAgent.DetailLink>
      </div>
      <div className="truncate text-xs text-muted-foreground">
        <StructureDisplay identifier="@lok/user" id={item.user.sub} variant="inline" />
      </div>
    </Card>
  </LovekitAgent.Smart>
);

export default React.memo(TheCard);
