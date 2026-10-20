import React from "react";
import { Button } from "@/core/ui/button";
import { Card } from "@/core/ui/card";
import { ActionDescription } from "@/core/ports/engine/ActionDescription";
import { RekuestAction } from "@/core/linkers";
import { useDialog } from "@/core/dialogs/registry";
import { Play } from "lucide-react";

import {
  ActionKind,
  BrowseActionFragment,
  ListActionFragment,
} from "@/rekuest/api/graphql";
import { AgentStatusDot } from "@/rekuest/components/displays/AgentStatusDot";
import { ActionLogo } from "@/rekuest/components/logo/ActionLogo";
import { ActionMonogram } from "@/rekuest/components/logo/ActionMonogram";
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

/** The logo up front: the action's blok, or its monogram when it has none. */
const LogoTile = ({ item }: Props) => (
  <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg ring-1 ring-foreground/10">
    {item.logo ? (
      <ActionLogo action={item} className="size-full p-1" />
    ) : (
      <ActionMonogram name={item.name} className="size-full text-sm" />
    )}
  </span>
);

const TheCard = ({ item }: Props) => {
  const availability = deriveAvailability(item.implementations);
  const { openDialog } = useDialog();
  const itemNotes = notes(item);

  return (
    <RekuestAction.Smart object={item} hover>
      <Card className="group flex h-full flex-col gap-2 p-3 ring ring-0 group-data-[selected=true]:ring-1">
        <div className="flex items-start gap-3">
          <LogoTile item={item} />
          <div className="min-w-0 flex-1 pt-0.5">
            <RekuestAction.DetailLink
              object={item}
              className="block truncate text-sm font-medium leading-tight transition-colors hover:text-primary"
            >
              {item.name}
            </RekuestAction.DetailLink>
            <div className="mt-0.5 truncate text-xs text-muted-foreground">
              {item.app.identifier}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
            aria-label={`Run ${item.name}`}
            title="Run"
            onClick={() => openDialog("assign", { target: { action: item.id } })}
          >
            <Play className="h-3.5 w-3.5" />
          </Button>
        </div>

        {item.description && (
          <div className="line-clamp-2 text-xs text-muted-foreground/80">
            <ActionDescription description={item.description} />
          </div>
        )}

        <div className="mt-auto flex items-center gap-1.5 pt-1 text-xs text-muted-foreground">
          <AgentStatusDot
            status={
              availability.status === "none" ? "offline" : availability.status
            }
          />
          <span className="shrink-0">{availabilityLabel(availability)}</span>
          {itemNotes.length > 0 && (
            <span className="truncate text-muted-foreground/60">
              · {itemNotes.join(" · ")}
            </span>
          )}
        </div>
      </Card>
    </RekuestAction.Smart>
  );
};

export default React.memo(TheCard);
