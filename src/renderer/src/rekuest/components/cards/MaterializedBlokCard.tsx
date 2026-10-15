import React from "react";
import { Box, LayoutPanelTop, Shapes } from "lucide-react";
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

import {
  ComponentContext,
  ListMaterializedBlokFragment,
} from "@/rekuest/api/graphql";

interface Props {
  item: ListMaterializedBlokFragment;
}

const CONTEXTS: Record<ComponentContext, { label: string; icon: typeof Box }> = {
  [ComponentContext.Scene]: { label: "3D scene", icon: Box },
  [ComponentContext.Html]: { label: "Panel", icon: LayoutPanelTop },
  [ComponentContext.Logo]: { label: "Logo", icon: Shapes },
  [ComponentContext.ActionLogo]: { label: "Action logo", icon: Shapes },
};

const MaterializedBlokCard = ({ item }: Props) => {
  const context = CONTEXTS[item.blok.context];
  const description = item.description ?? item.blok.description;
  // One row per app, however many of the blok's dependencies it answers.
  const agents = [
    ...new Map(
      item.agentMappings.map((mapping) => [mapping.agent.id, mapping.agent]),
    ).values(),
  ];
  const online = agents.filter((agent) => agent.connected).length;

  return (
    <RekuestMaterializedBlok.Smart object={item}>
      <Card className="group flex h-full flex-col">
        <CardHeader className="gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {context && (
              <Badge variant="secondary" className="gap-1">
                <context.icon className="h-3 w-3" />
                {context.label}
              </Badge>
            )}
            {item.isDefault && <Badge variant="outline">Default</Badge>}
          </div>
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
        <CardContent className="mt-auto flex flex-col gap-2 text-xs text-muted-foreground">
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
