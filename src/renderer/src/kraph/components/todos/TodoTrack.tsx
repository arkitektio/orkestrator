import { useSelf } from "@/core/connection/useSelf";
import { KraphTodoItem, KraphTodoList } from "@/core/linkers";
import { Badge } from "@/core/ui/badge";
import {
  TodoItemStructureFragment,
  TodoItemWithListFragment,
  TodoStatus,
  useTodoItemsQuery,
} from "@/kraph/api/graphql";
import { todoStatusLabel } from "@/kraph/lib/todos";
import { Check, ListTodo, Play } from "lucide-react";
import React from "react";
import { TodoAssignee } from "./TodoAssignee";
import { TodoStatusButtons } from "./TodoStatusButtons";

/**
 * An object's todo track: the items it is on, each with the object's own
 * status there. Drawn in the page bar's hover card and the Knowledge sidebar.
 */
export type Track = { item: TodoItemWithListFragment; own: TodoItemStructureFragment };

/** The object's state across its todo items: Doing wins, then open, then Done. */
export const overall = (tracks: readonly Track[]): TodoStatus | null => {
  if (tracks.length === 0) return null;
  if (tracks.some(({ own }) => own.status === TodoStatus.Doing)) return TodoStatus.Doing;
  if (tracks.some(({ own }) => own.status === TodoStatus.Todo)) return TodoStatus.Todo;
  return TodoStatus.Done;
};

export const STATUS_ICON: Record<TodoStatus, React.ComponentType<{ className?: string }>> = {
  [TodoStatus.Todo]: ListTodo,
  [TodoStatus.Doing]: Play,
  [TodoStatus.Done]: Check,
};

/** One todo item the object is on: your Doing / Done when it is yours, else who it is for. */
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
        {!mine && (
          <Badge variant="outline" className="shrink-0">
            {todoStatusLabel(own.status)}
          </Badge>
        )}
      </div>
      <KraphTodoList.DetailLink object={item.list} className="truncate text-xs text-muted-foreground">
        {item.list.project.name} / {item.list.name}
      </KraphTodoList.DetailLink>
      {mine ? (
        <TodoStatusButtons structure={own} />
      ) : (
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          {item.effectiveAssignee ? (
            <>
              For <TodoAssignee own={item.assignee} inherited={item.effectiveAssignee} />
            </>
          ) : (
            "Unassigned"
          )}
        </span>
      )}
    </div>
  );
};

/** The items `object` is on, each with the object's own row there. */
export const useTodoTracks = (identifier: string, object: string): Track[] => {
  const { data } = useTodoItemsQuery({ variables: { filters: { identifier, object } } });
  return React.useMemo<Track[]>(
    () =>
      (data?.todoItems ?? []).flatMap((item) => {
        const own = item.structures.find((candidate) => candidate.identifier === identifier && candidate.object === object);
        return own ? [{ item, own }] : [];
      }),
    [data, identifier, object],
  );
};

/** Whether the signed-in user is who a track's item is for. */
export const useIsMine = (track: Track) => {
  const me = useSelf().userId;
  return me !== null && track.item.effectiveAssignee === String(me);
};
