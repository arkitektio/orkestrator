import React from "react";
import { Badge } from "@/core/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/core/ui/card";
import Timestamp from "@/core/ui/timestamp";
import { cn } from "@/core/util/utils";
import { RekuestBlok, RekuestMaterializedBlok } from "@/core/linkers";

import { ListMaterializedBlokFragment } from "@/rekuest/api/graphql";
import { BLOK_CONTEXTS } from "@/rekuest/components/blokContexts";
import { BlokCardBackdrop } from "@/rekuest/components/preview/RekuestBlokPreview";

interface Props {
  item: ListMaterializedBlokFragment;
}

const MaterializedBlokCard = ({ item }: Props) => {
  const context = BLOK_CONTEXTS[item.blok.context];
  const description = item.description ?? item.blok.description;
  // One row per app, however many of the blok's dependencies it answers.
  const agents = [
    ...new Map(
      item.agentMappings.map((mapping) => [mapping.agent.id, mapping.agent]),
    ).values(),
  ];
  const online = agents.filter((agent) => agent.connected).length;
  // The preview loads its models and images from the agents this blok is bound to.
  const bound = React.useMemo(
    () => new Map(item.agentMappings.map((mapping) => [mapping.key, mapping.agent.id])),
    [item.agentMappings],
  );

  return (
    <RekuestMaterializedBlok.Smart object={item}>
      <Card className="group relative isolate h-full min-h-56">
        <BlokCardBackdrop blok={item.blok} agents={bound} />
        <div className="flex flex-wrap items-center gap-1.5 px-4">
          {context && (
            <Badge variant="secondary" className="gap-1 shadow-sm">
              <context.icon className="h-3 w-3" />
              {context.label}
            </Badge>
          )}
          {item.isDefault && (
            <Badge variant="outline" className="bg-card/80 shadow-sm">
              Default
            </Badge>
          )}
          {item.declaredBy && (
            <Badge
              variant="outline"
              className="max-w-40 truncate bg-card/80 shadow-sm"
              title="Its agent keeps it in step with its registrations"
            >
              {item.declaredBy.name}
            </Badge>
          )}
        </div>
        <CardHeader className="mt-auto gap-1">
          <CardTitle className="text-base">
            <RekuestMaterializedBlok.DetailLink object={item}>
              {item.name ?? item.blok.name}
            </RekuestMaterializedBlok.DetailLink>
          </CardTitle>
          <CardDescription className="flex flex-col gap-1 text-sm">
            {description && <span className="line-clamp-2">{description}</span>}
            <span className="text-xs">
              Blok{" "}
              <RekuestBlok.DetailLink object={item.blok}>
                {item.blok.name}
              </RekuestBlok.DetailLink>
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-xs text-muted-foreground">
          {agents.length > 0 ? (
            <ul className="flex flex-col gap-1">
              {agents.slice(0, 3).map((agent) => (
                <li key={agent.id} className="flex items-center gap-2">
                  <span
                    className={cn(
                      "h-2 w-2 shrink-0 rounded-full",
                      agent.connected ? "bg-green-500" : "bg-muted-foreground/40",
                    )}
                  />
                  <span className="truncate">{agent.name}</span>
                </li>
              ))}
              {agents.length > 3 && <li>+{agents.length - 3} more</li>}
            </ul>
          ) : (
            <span>No apps connected</span>
          )}
          <div className="flex items-center justify-between gap-2">
            {agents.length > 0 && (
              <span>
                {online} of {agents.length} online
              </span>
            )}
            <span className="ml-auto">
              <Timestamp date={item.updatedAt} relative />
            </span>
          </div>
        </CardContent>
      </Card>
    </RekuestMaterializedBlok.Smart>
  );
};

export default React.memo(MaterializedBlokCard);
