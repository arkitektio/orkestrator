import { useSelf } from "@/core/connection/useSelf";
import { KraphTodoItem, KraphTodoList } from "@/core/linkers";
import { Button } from "@/core/ui/button";
import Timestamp from "@/core/ui/timestamp";
import {
  SlimTodoItemFragment,
  TodoItemStructureFragment,
  TodoStatus,
  useTodoTrackQuery,
} from "@/kraph/api/graphql";
import { StructureDisplay } from "@/core/smart/display/StructureDisplay";
import { cn } from "@/core/util/utils";
import { STATUS_RING } from "@/kraph/lib/todoStatus";
import { dueState, todoStatusLabel } from "@/kraph/lib/todos";
import { Check, Play, RotateCcw } from "lucide-react";
import React from "react";
import { DoneAndNextButton } from "./DoneAndNextButton";
import { TodoDue } from "./TodoDue";
import { TodoStatusControl } from "./TodoStatusControl";
import { useSetTodoStatus } from "./useSetTodoStatus";

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

/** Someone in a sentence: "you", or their name. */
const Who = ({ sub, me }: { sub: string; me: string | null }) =>
  sub === me ? <>you</> : <span className="font-medium text-foreground/80"><StructureDisplay identifier="@lok/user" id={sub} variant="inline" /></span>;

const Ago = ({ at }: { at: unknown }) =>
  at ? <span className="tabular-nums"><Timestamp date={at as string} relative /></span> : null;

/**
 * Where the object stands on the item, said as a sentence instead of badges:
 * "Waiting on you", "Anna started it 2 h ago", "Done by you yesterday",
 * "Nobody's on it yet".
 */
const TrackContext = ({ track, me }: { track: Track; me: string | null }) => {
  const { item, own } = track;
  const assignee = item.effectiveAssignee;
  if (own.status === TodoStatus.Done) {
    return own.doneBy ? (
      <>
        Done by <Who sub={own.doneBy} me={me} /> <Ago at={own.doneAt} />
      </>
    ) : (
      <>Done <Ago at={own.doneAt} /></>
    );
  }
  if (own.status === TodoStatus.Doing) {
    return own.startedBy ? (
      <>
        {own.startedBy === me ? "You" : <Who sub={own.startedBy} me={me} />} started it <Ago at={own.startedAt} />
      </>
    ) : (
      <>In progress</>
    );
  }
  if (!assignee) return <>Nobody&apos;s on it yet</>;
  return (
    <span title={item.assignee ? undefined : "Assigned through its list"}>
      Waiting on <Who sub={assignee} me={me} />
    </span>
  );
};

/** A status mark that only shows (an item that is someone else's): the same ring as the one you tick. */
const StatusMark = ({ status }: { status: TodoStatus }) => (
  <span
    aria-label={todoStatusLabel(status)}
    title={todoStatusLabel(status)}
    className={cn(
      "flex size-4 shrink-0 items-center justify-center rounded-full ring-2 ring-inset",
      STATUS_RING[status],
      status === TodoStatus.Done && "bg-success text-success-foreground",
    )}
  >
    {status === TodoStatus.Done ? <Check className="size-2.5" strokeWidth={3} /> : status === TodoStatus.Doing ? <span className="size-1.5 rounded-full bg-warning" /> : null}
  </span>
);

/** How far the item's objects are, when it has more than this one: a thin bar and "3/5". */
const ItemProgress = ({ progress }: { progress: { done: number; total: number } }) => {
  if (progress.total < 2) return null;
  const share = Math.round((progress.done / progress.total) * 100);
  return (
    <span className="ml-auto flex shrink-0 items-center gap-1.5 tabular-nums" title={`${progress.done} of ${progress.total} objects on this item done`}>
      <span className="h-1 w-10 overflow-hidden rounded-full bg-muted">
        <span className="block h-full rounded-full bg-success transition-[width]" style={{ width: `${share}%` }} />
      </span>
      {progress.done}/{progress.total}
    </span>
  );
};

/** The next step on your own object, as words: Start, Done & next, or Reopen (the round mark ticks it done). */
const TrackActions = ({ track }: { track: Track }) => {
  const { item, own } = track;
  const { setStatus, loading } = useSetTodoStatus(own, item);
  const step = (to: TodoStatus, Icon: typeof Play, label: string) => (
    <Button
      size="sm"
      variant="ghost"
      className="h-6 gap-1 px-2 text-xs"
      disabled={loading}
      onClick={(event) => {
        event.stopPropagation();
        void setStatus(to);
      }}
    >
      <Icon className="size-3" />
      {label}
    </Button>
  );
  return (
    <div className="-ml-2 flex items-center gap-0.5">
      {own.status === TodoStatus.Todo && step(TodoStatus.Doing, Play, "Start")}
      {own.status === TodoStatus.Done && step(TodoStatus.Todo, RotateCcw, "Reopen")}
      <DoneAndNextButton structure={own} item={item} variant="label" />
    </div>
  );
};

/**
 * One todo item the object is on: a mark for the object's status there (one
 * to tick when the item is yours), the item's title, where things stand as a
 * sentence, its list, how far its other objects are, and the next step when
 * it is yours. The page bar's popover and the Knowledge sidebar.
 */
export const TrackRow = ({ track }: { track: Track }) => {
  const { item, own } = track;
  const self = useSelf().userId;
  const me = self === null ? null : String(self);
  const mine = me !== null && item.effectiveAssignee === me;
  const done = own.status === TodoStatus.Done;
  return (
    <div className="group/track flex gap-2.5 rounded-md px-2 py-2 transition-colors hover:bg-muted/50">
      <div className="pt-0.5">
        {mine ? <TodoStatusControl structure={own} item={item} variant="check" /> : <StatusMark status={own.status} />}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex min-w-0 items-center gap-2">
          <KraphTodoItem.DetailLink
            object={item}
            className={cn("min-w-0 flex-1 truncate text-sm font-medium hover:underline", done && "text-muted-foreground line-through decoration-muted-foreground/40")}
          >
            {item.title}
          </KraphTodoItem.DetailLink>
          {item.effectiveAssignee && item.effectiveAssignee !== me && (
            <StructureDisplay
              identifier="@lok/user"
              id={item.effectiveAssignee}
              variant="avatar"
              className={cn("size-5 shrink-0 [&>[data-slot=avatar-fallback]]:text-[0.55rem]", !item.assignee && "opacity-60")}
            />
          )}
        </div>
        <p className="flex min-w-0 flex-wrap items-center gap-x-1 text-xs text-muted-foreground">
          <TrackContext track={track} me={me} />
          {!done && item.effectiveDueAt && dueState(item.effectiveDueAt, own.status) && (
            <>
              <span aria-hidden>·</span>
              <TodoDue due={item.effectiveDueAt} status={own.status} inherited={!item.dueAt} className="[&>svg]:hidden" />
            </>
          )}
        </p>
        <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
          <KraphTodoList.DetailLink object={item.list} className="min-w-0 truncate hover:text-foreground">
            {item.list.project.name} › {item.list.name}
          </KraphTodoList.DetailLink>
          <ItemProgress progress={item.progress} />
        </div>
        {mine && <TrackActions track={track} />}
      </div>
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
