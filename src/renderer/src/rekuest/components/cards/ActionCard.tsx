import React from "react";
import { Button } from "@/core/components/ui/button";
import { Card } from "@/core/components/ui/card";
import { ActionDescription } from "@/core/lib/ports/ActionDescription";
import { RekuestAction } from "@/core/linkers";
import { Play } from "lucide-react";

import {
  ActionKind,
  BrowseActionFragment,
  ListActionFragment,
} from "@/rekuest/api/graphql";
import { ActionButton } from "@/rekuest/buttons/ActionButton";
import { AgentStatusDot } from "@/rekuest/components/displays/AgentStatusDot";
import { Availability, deriveAvailability } from "@/rekuest/lib/actionBrowse";

// The catalog selects BrowseAction; every other list (Home, search) selects
// ListAction. The extra fields only add footer notes, so they stay optional.
type Item = ListActionFragment &
  Partial<Pick<BrowseActionFragment, "definedAt" | "isDev">>;

interface Props {
  item: Item;
}

const NEW_FOR_MS = 7 * 24 * 60 * 60 * 1000;

const availabilityLabel = (availability: Availability) => {
  if (availability.status === "none") return "no app";
  if (availability.online > 0) return `${availability.online} online`;
  return availability.status === "recent" ? "recent" : "offline";
};

// Only what sets an action apart: a plain stateless function gets no notes.
const notes = (item: Item) =>
  [
    item.definedAt &&
    Date.now() - new Date(item.definedAt).getTime() < NEW_FOR_MS
      ? "new"
      : null,
    item.kind === ActionKind.Generator ? "generator" : null,
    item.stateful ? "stateful" : null,
    item.isDev ? "dev" : null,
  ].filter(Boolean);

const TheCard = ({ item }: Props) => {
  const availability = deriveAvailability(item.implementations);

  return (
    <RekuestAction.Smart object={item} hover>
      <Card className="group flex h-full flex-col gap-1.5 p-3 ring ring-0 group-data-[selected=true]:ring-1">
        <div className="flex items-baseline justify-between gap-2">
          <RekuestAction.DetailLink
            object={item}
            className="min-w-0 truncate text-sm font-medium leading-tight hover:text-primary transition-colors"
          >
            {item.name}
          </RekuestAction.DetailLink>
          <span className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
            <AgentStatusDot
              status={
                availability.status === "none" ? "offline" : availability.status
              }
            />
            {availabilityLabel(availability)}
          </span>
        </div>

        <div className="truncate text-xs text-muted-foreground">
          {item.app.identifier}
        </div>

        {item.description && (
          <div className="line-clamp-2 text-xs text-muted-foreground/80">
            <ActionDescription description={item.description} />
          </div>
        )}

        <div className="mt-auto flex h-6 items-center justify-between gap-2 pt-1 text-xs text-muted-foreground/60">
          <span className="truncate">{notes(item).join(" · ")}</span>
          <ActionButton id={item.id}>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
              aria-label={`Run ${item.name}`}
              title="Run"
            >
              <Play className="h-3.5 w-3.5" />
            </Button>
          </ActionButton>
        </div>
      </Card>
    </RekuestAction.Smart>
  );
};

export default React.memo(TheCard);
