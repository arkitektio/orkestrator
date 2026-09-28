import { useDialog } from "@/core/dialogs/registry";
import { Badge } from "@/core/ui/badge";
import { Input } from "@/core/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/core/ui/select";
import { Separator } from "@/core/ui/separator";
import { Textarea } from "@/core/ui/textarea";
import { TooltipButton } from "@/core/ui/tooltip-button";
import { toast } from "@/core/notify";
import { cn } from "@/core/util/utils";
import { AlarmClock, AlarmClockOff, Bot, Check, Maximize2, Pencil, Pin, PinOff, RotateCcw, X } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  TaskFragment,
  TaskLinkSource,
  TaskStatus,
  TaskThreadFragment,
  UpdateTaskInput,
  useListTaskListsQuery,
  useSetTaskStatusMutation,
  useSnoozeTasksMutation,
  useUnlinkThreadsMutation,
  useUpdateTaskMutation,
} from "../../api/graphql";
import { toastText } from "../../errors";
import { formatMailDate } from "../../format";
import { MailTask, MailThread } from "../../linkers";
import { participantsLabel } from "../list/rows";
import { ListDot } from "./ListDot";
import { formatDue, fromLocalInput, isOverdue, TASK_VIEWS, toLocalInput } from "./taskOps";

const Divider = () => <Separator orientation="vertical" className="mx-1 h-5" />;

const fail = (e: unknown) => toast.error(toastText(e));

/** Change a task's fields; lists refetch when what they filter on moved. */
const useUpdate = (id: string) => {
  const [update] = useUpdateTaskMutation({ refetchQueries: TASK_VIEWS });
  return (input: Omit<UpdateTaskInput, "id">) => update({ variables: { input: { id, ...input } } }).catch(fail);
};

/** Finish, drop, snooze, pin, edit: the task's own toolbar. */
const TaskToolbar = ({ task, page }: { task: TaskFragment; page?: string }) => {
  const { openDialog } = useDialog();
  const navigate = useNavigate();
  const [setStatus] = useSetTaskStatusMutation({ refetchQueries: TASK_VIEWS });
  const [snooze] = useSnoozeTasksMutation({ refetchQueries: TASK_VIEWS });
  const update = useUpdate(task.id);
  const status = (next: TaskStatus, done: string) =>
    setStatus({ variables: { input: { tasks: [task.id], status: next } } })
      .then(() => toast.success(done))
      .catch(fail);
  const open = task.status === TaskStatus.Open;

  return (
    <div className="sticky top-0 z-20 flex h-12 shrink-0 items-center gap-0.5 border-b bg-background/80 px-2 backdrop-blur-md">
      {open ? (
        <>
          <TooltipButton variant="ghost" size="icon-lg" tooltip="Mark done" onClick={() => status(TaskStatus.Done, "Done")}>
            <Check />
          </TooltipButton>
          <TooltipButton variant="ghost" size="icon-lg" tooltip="Dismiss" onClick={() => status(TaskStatus.Dismissed, "Dismissed")}>
            <X />
          </TooltipButton>
        </>
      ) : (
        <TooltipButton variant="ghost" size="icon-lg" tooltip="Open again" onClick={() => status(TaskStatus.Open, "Opened again")}>
          <RotateCcw />
        </TooltipButton>
      )}
      <Divider />
      {task.snoozed ? (
        <TooltipButton
          variant="ghost"
          size="icon-lg"
          tooltip="Wake now"
          onClick={() => snooze({ variables: { input: { tasks: [task.id], until: null } } }).catch(fail)}
        >
          <AlarmClockOff />
        </TooltipButton>
      ) : (
        <TooltipButton
          variant="ghost"
          size="icon-lg"
          tooltip="Snooze…"
          onClick={() => openDialog("kuvertsnooze", { tasks: [task.id] }, { size: "small" })}
        >
          <AlarmClock />
        </TooltipButton>
      )}
      <TooltipButton variant="ghost" size="icon-lg" tooltip={task.pinned ? "Unpin" : "Pin to the top"} onClick={() => update({ pinned: !task.pinned })}>
        {task.pinned ? <PinOff /> : <Pin />}
      </TooltipButton>
      <TooltipButton variant="ghost" size="icon-lg" tooltip="Edit" onClick={() => openDialog("kuverttask", { id: task.id }, { size: "medium" })}>
        <Pencil />
      </TooltipButton>
      <div className="ml-auto flex items-center gap-0.5">
        <MailTask.ObjectButton object={task} />
        {page && (
          <TooltipButton variant="ghost" size="icon-lg" tooltip="Open as a page" onClick={() => navigate(page)}>
            <Maximize2 />
          </TooltipButton>
        )}
      </div>
    </div>
  );
};

/** Text saved when it loses focus, and only when it changed. */
const useDraft = (value: string, save: (next: string) => void) => {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  const commit = () => {
    if (draft !== value) save(draft);
  };
  return { draft, setDraft, commit };
};

/** A conversation in the task: its subject and people, who put it here and why. */
const LinkRow = ({ link, task }: { link: TaskThreadFragment; task: string }) => {
  const navigate = useNavigate();
  const [unlink, { loading }] = useUnlinkThreadsMutation({ refetchQueries: TASK_VIEWS });
  const t = link.thread;
  const m = t.latestMessage;
  const from = participantsLabel(t.participants, t.account.emailAddress) || m?.senderName || "";

  return (
    <MailThread.Smart object={{ id: t.id, subject: t.subject }}>
      <div
        role="link"
        tabIndex={0}
        onClick={() => navigate(MailThread.linkBuilder(t.id))}
        onKeyDown={(e) => e.key === "Enter" && navigate(MailThread.linkBuilder(t.id))}
        className="group relative flex cursor-pointer flex-col gap-0.5 px-4 py-2.5 hover:bg-muted/50"
      >
        <div className="flex items-baseline gap-2">
          {t.unread && <span className="size-2 shrink-0 self-center rounded-full bg-primary" aria-label="Unread" />}
          <span className={cn("min-w-0 truncate text-sm", t.unread ? "font-semibold" : "font-medium")}>
            {t.subject || "(no subject)"}
          </span>
          {t.messageCount > 1 && <span className="shrink-0 text-xs text-muted-foreground">{t.messageCount}</span>}
          <span className="ml-auto shrink-0 text-xs text-muted-foreground">{formatMailDate(t.lastMessageAt)}</span>
        </div>
        <span className="truncate text-xs text-muted-foreground">
          {from}
          {m?.snippet && ` — ${m.snippet}`}
        </span>
        {(link.source === TaskLinkSource.App || link.reason) && (
          <div className="flex items-center gap-1.5 pt-0.5 text-xs text-muted-foreground">
            {link.source === TaskLinkSource.App && (
              <Badge variant="secondary" className="gap-1 px-1.5 py-0 text-[10px]">
                <Bot className="size-3" />
                Sorted by an app
                {link.confidence != null && ` · ${Math.round(link.confidence * 100)}%`}
              </Badge>
            )}
            {link.reason && <span className="truncate italic">{link.reason}</span>}
          </div>
        )}
        <div className="absolute right-2 top-1.5 hidden group-hover:block">
          <TooltipButton
            variant="ghost"
            size="icon-sm"
            tooltip="Take out of the task"
            disabled={loading}
            onClick={(e) => {
              e.stopPropagation();
              unlink({ variables: { input: { task, threads: [t.id] } } }).catch(fail);
            }}
          >
            <X />
          </TooltipButton>
        </div>
      </div>
    </MailThread.Smart>
  );
};

/** List, due date and state, in one quiet line under the title. */
const TaskMeta = ({ task }: { task: TaskFragment }) => {
  const update = useUpdate(task.id);
  const { data } = useListTaskListsQuery({ variables: { pagination: { limit: 200 } } });
  const lists = data?.taskLists ?? [];
  const overdue = task.status === TaskStatus.Open && isOverdue(task.dueAt);

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
      {task.status !== TaskStatus.Open && (
        <Badge variant="secondary">
          {task.status === TaskStatus.Done ? "Done" : "Dismissed"}
          {task.completedAt && ` ${formatMailDate(task.completedAt)}`}
        </Badge>
      )}
      {task.snoozed && task.snoozedUntil && (
        <Badge variant="outline" className="gap-1">
          <AlarmClock className="size-3" />
          Snoozed until {formatDue(task.snoozedUntil)}
        </Badge>
      )}
      <Select value={task.list?.id ?? "none"} onValueChange={(v) => update({ list: v === "none" ? null : v })}>
        <SelectTrigger size="sm" className="h-7 w-auto gap-1.5 border-0 bg-transparent px-2 text-xs shadow-none hover:bg-muted">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">
            <span className="flex items-center gap-2">
              <ListDot />
              No list
            </span>
          </SelectItem>
          {lists.map((l) => (
            <SelectItem key={l.id} value={l.id}>
              <span className="flex items-center gap-2">
                <ListDot color={l.color} />
                {l.name}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <label className={cn("flex items-center gap-1.5 rounded-md px-2 hover:bg-muted", overdue && "text-destructive")}>
        Due
        <Input
          type="datetime-local"
          className="h-7 w-auto border-0 bg-transparent px-0 text-xs shadow-none focus-visible:ring-0"
          defaultValue={toLocalInput(task.dueAt)}
          key={task.dueAt ?? "none"}
          onBlur={(e) => {
            const next = fromLocalInput(e.target.value);
            if (next !== (task.dueAt ? new Date(task.dueAt).toISOString() : null)) update({ dueAt: next });
          }}
        />
      </label>
    </div>
  );
};

/**
 * A task, readable and editable in place: its toolbar, the title and notes
 * (saved when they lose focus), list and due date, and its conversations.
 */
export const TaskDetail = ({ task, page }: { task: TaskFragment; page?: string }) => {
  const update = useUpdate(task.id);
  const title = useDraft(task.title, (next) => next.trim() && update({ title: next.trim() }));
  const notes = useDraft(task.notes, (next) => update({ notes: next }));
  const blurOnEnter = (e: React.KeyboardEvent<HTMLInputElement>) => e.key === "Enter" && e.currentTarget.blur();

  return (
    <div className="flex min-h-full flex-col bg-muted/40">
      <TaskToolbar task={task} page={page} />
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-3 px-4 pb-6 pt-5">
        <header className="flex flex-col gap-1 px-1">
          <input
            aria-label="Title"
            value={title.draft}
            onChange={(e) => title.setDraft(e.target.value)}
            onBlur={title.commit}
            onKeyDown={blurOnEnter}
            className={cn(
              "w-full bg-transparent text-2xl font-semibold leading-tight tracking-tight outline-none",
              task.status !== TaskStatus.Open && "text-muted-foreground line-through",
            )}
          />
          <TaskMeta task={task} />
        </header>
        <Textarea
          aria-label="Notes"
          placeholder="Notes"
          value={notes.draft}
          onChange={(e) => notes.setDraft(e.target.value)}
          onBlur={notes.commit}
          className="min-h-20 resize-y border-0 bg-card shadow-sm"
        />
        {task.links.length > 0 && (
          <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
            <h2 className="border-b px-4 py-2 text-xs font-medium text-muted-foreground">
              {task.links.length} {task.links.length === 1 ? "conversation" : "conversations"}
            </h2>
            <div className="flex flex-col divide-y">
              {task.links.map((link) => (
                <LinkRow key={link.id} link={link} task={task.id} />
              ))}
            </div>
          </section>
        )}
    </div>
    </div>
  );
};
