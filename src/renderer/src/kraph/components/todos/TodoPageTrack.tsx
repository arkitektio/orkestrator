import { structure } from "@/core/smart/structure";
import { StructureDisplay } from "@/core/smart/display/StructureDisplay";
import type { Object } from "@/core/types";
import { Badge } from "@/core/ui/badge";
import { Button } from "@/core/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/core/ui/popover";
import { cn } from "@/core/util/utils";
import { TodoStatus } from "@/kraph/api/graphql";
import { AddToTodoFields } from "@/kraph/forms/todos/AddToTodoForm";
import { todoStatusLabel } from "@/kraph/lib/todos";
import { ListPlus, ListTodo } from "lucide-react";
import React from "react";
import { STATUS_ICON, Track, TrackRow, useIsMine, useTodoTracks } from "./TodoTrack";
import { TodoStatusToggle } from "./TodoStatusToggle";

/** How many items get their own chip in the bar; the rest are in the popover. */
const INLINE = 2;

/**
 * One item in the bar: who it is for (a round avatar) and how far this object
 * is. Yours: Doing / Done right there. Someone else's: their status.
 */
const InlineTrack = ({ track }: { track: Track }) => {
  const mine = useIsMine(track);
  const { item, own } = track;
  const Icon = STATUS_ICON[own.status];
  return (
    <div className="flex items-center gap-1 rounded-full border py-0.5 pl-0.5 pr-1" title={`${item.title} · ${todoStatusLabel(own.status)}`}>
      {item.effectiveAssignee ? (
        <StructureDisplay
          identifier="@lok/user"
          id={item.effectiveAssignee}
          variant="avatar"
          className={cn("size-6 shrink-0 rounded-full", !item.assignee && "opacity-70")}
        />
      ) : (
        <span className="flex size-6 items-center justify-center rounded-full bg-muted text-[0.6rem] text-muted-foreground">?</span>
      )}
      {mine ? (
        <TodoStatusToggle structure={own} />
      ) : (
        <Badge
          variant={own.status === TodoStatus.Todo ? "outline" : "secondary"}
          className={cn("gap-1", own.status !== TodoStatus.Todo && "text-primary")}
        >
          <Icon className="size-3" />
          {todoStatusLabel(own.status)}
        </Badge>
      )}
    </div>
  );
};

/**
 * The object's todo track beside every datum page's breadcrumbs (the host's
 * "pagebar" slot): each item it is on as a chip — the assignee's avatar and
 * the object's status, with Doing / Done on the items that are yours — and a
 * button that opens the rest in a popover: every item, and adding the object
 * to another one.
 */
export const TodoPageTrack = ({ identifier, object }: { identifier: string; object: Object }) => {
  const id = String(object.id);
  const tracks = useTodoTracks(identifier, id);
  const [open, setOpen] = React.useState(false);

  const label = typeof object.label === "string" ? object.label : typeof object.name === "string" ? object.name : undefined;
  const structures = React.useMemo(() => [structure(identifier, id, { label })], [identifier, id, label]);
  const hidden = tracks.length - INLINE;

  return (
    <div className="flex items-center gap-1">
      {tracks.slice(0, INLINE).map((track) => (
        <InlineTrack key={track.item.id} track={track} />
      ))}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="relative size-7"
            aria-label={tracks.length ? "Todo items" : "Add to todo…"}
            title={tracks.length ? "Todo items" : "Add to todo…"}
          >
            {tracks.length ? <ListTodo className="size-4" /> : <ListPlus className="size-4" />}
            {hidden > 0 && (
              <span className="absolute -right-0.5 -top-0.5 min-w-3.5 rounded-full bg-primary px-0.5 text-[0.6rem] leading-3.5 text-primary-foreground tabular-nums">
                +{hidden}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="flex w-96 flex-col gap-3">
          {tracks.length > 0 && (
            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold">Todo</h3>
              {tracks.map((track) => (
                <TrackRow key={track.item.id} track={track} />
              ))}
            </div>
          )}
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold">{tracks.length ? "Add to another todo" : "Add to todo"}</h3>
            {/* The new item shows up above once it is made; the popover stays. */}
            <AddToTodoFields structures={structures} />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};
