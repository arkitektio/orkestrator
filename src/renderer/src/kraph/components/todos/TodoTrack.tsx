import { useSelf } from "@/core/connection/useSelf";
import { KraphTodoItem, KraphTodoList } from "@/core/linkers";
import { Badge } from "@/core/ui/badge";
import {
  SlimTodoItemFragment,
  TodoItemStructureFragment,
  TodoStatus,
  useTodoTrackQuery,
} from "@/kraph/api/graphql";
import { StructureDisplay } from "@/core/smart/display/StructureDisplay";
import { cn } from "@/core/util/utils";
import { STATUS_PILL } from "@/kraph/lib/todoStatus";
import { todoStatusLabel } from "@/kraph/lib/todos";
import React from "react";
import { TodoAssignee } from "./TodoAssignee";
import { DoneAndNextButton } from "./DoneAndNextButton";
import { TodoDue } from "./TodoDue";
import { TodoStatusControl } from "./TodoStatusControl";

/**
 * An object's todo track: the items it is on, each with the object's own
 * status there. Drawn in the page bar's hover card and the Knowledge sidebar.
 */
export type Track = { item: SlimTodoItemFragment; own: TodoItemStructureFragment };

/** The object's state across its todo items: Doing wins, then open, then Done. */
export const overall = (tracks: readonly Track[]): TodoStatus | null => {
  if (tracks.length === 0) return null;
  if (tracks.some(({ own }) => own.status === TodoStatus.Doing)) return TodoStatus.Doing;
  if (tracks.some(({ own }) => own.status === TodoStatus.Todo)) return TodoStatus.Todo;
  return TodoStatus.Done;
};

/** One todo item the object is on: the object's status there (yours to change when the item is yours), and who it is for. */
export const TrackRow = ({ track }: { track: Track }) => {
  const { item, own } = track;
  const me = useSelf().userId;
  const mine = me !== null && item.effectiveAssignee === String(me);
  return (
    <div className="flex flex-col gap-1.5 rounded-md border p-2">
      <div className="flex min-w-0 items-center gap-2">
        <KraphTodoItem.DetailLink object={item} className="min-w-0 flex-1 truncate text-sm font-medium">
          {item.title}
        </KraphTodoItem.DetailLink>
        <TodoDue due={item.effectiveDueAt} status={own.status} inherited={!item.dueAt} />
        {mine ? (
          <TodoStatusControl structure={own} item={item} variant="pill" className="shrink-0" />
        ) : (
          <Badge variant="outline" className={cn("shrink-0", STATUS_PILL[own.status])}>
            {todoStatusLabel(own.status)}
          </Badge>
        )}
      </div>
      <KraphTodoList.DetailLink object={item.list} className="truncate text-xs text-muted-foreground">
        {item.list.project.name} / {item.list.name}
      </KraphTodoList.DetailLink>
      <span className="flex min-w-0 flex-wrap items-center gap-1 text-xs text-muted-foreground">
        {mine ? (
          <>
            For you
            <DoneAndNextButton structure={own} item={item} variant="label" className="ml-auto" />
          </>
        ) : item.effectiveAssignee ? (
          <>
            For <TodoAssignee own={item.assignee} inherited={item.effectiveAssignee} />
          </>
        ) : (
          "Unassigned"
        )}
        {(own.status === TodoStatus.Done ? own.doneBy : own.status === TodoStatus.Doing ? own.startedBy : null) && (
          <>
            {" · "}
            {own.status === TodoStatus.Done ? "done by" : "started by"}{" "}
            <StructureDisplay
              identifier="@lok/user"
              id={own.status === TodoStatus.Done ? own.doneBy : own.startedBy}
              variant="chip"
            />
          </>
        )}
      </span>
    </div>
  );
};

/**
 * The items `object` is on, each with the object's own row there. One small
 * read (`todoItemStructures`): the object's rows with their item, never the
 * item's other objects, so a page over one of 500 images reads one row.
 */
export const useTodoTrackResult = (identifier: string, object: string, skip = false) =>
  useTodoTrackQuery({ variables: { identifier, object }, skip });

export const tracksOf = (rows: readonly { item: SlimTodoItemFragment }[] | undefined): Track[] =>
  (rows ?? []).map(({ item, ...own }) => ({ item, own: own as TodoItemStructureFragment }));

export const useTodoTracks = (identifier: string, object: string): Track[] => {
  const { data } = useTodoTrackResult(identifier, object);
  return React.useMemo(() => tracksOf(data?.todoItemStructures), [data]);
};

/** Whether the signed-in user is who a track's item is for. */
export const useIsMine = (track: Track) => {
  const me = useSelf().userId;
  return me !== null && track.item.effectiveAssignee === String(me);
};
