import { Button } from "@/core/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/core/ui/empty";
import { Spinner } from "@/core/ui/spinner";
import { cn } from "@/core/util/utils";
import { Flag, Inbox, Paperclip } from "lucide-react";
import React, { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useKuvert } from "../../api/funcs";
import {
  FolderRole,
  MessageFilter,
  MessageOrder,
  ThreadFilter,
  useListMessagesQuery,
  useListThreadsQuery,
  useThreadsCountQuery,
} from "../../api/graphql";
import { formatMailDate } from "../../format";
import { MailMessage, MailThread } from "../../linkers";
import { deleteMail, threadMessages } from "../../mailOps";
import { useMailSelection } from "../split/selection";
import { MailRow, rowsFromMessages, rowsFromThreads } from "./rows";

const PAGE = 50;

/**
 * What a list shows: conversations (a mailbox, a folder — `inFolder` /
 * `inRole` scope each row's preview and unread count to it) or single mails
 * (search results, in the server's relevance order).
 */
export type MailSource =
  | { kind: "threads"; filters?: ThreadFilter; inFolder?: string; inRole?: FolderRole }
  | { kind: "messages"; filters?: MessageFilter; ordering?: MessageOrder[] };

export type MailEmpty = { title: string; description?: string; action?: React.ReactNode };

/**
 * One row: unread dot and flag in the gutter; who and when; subject; two
 * lines of the newest mail. The focused selection fills with the brand
 * colour, an unfocused one with muted.
 */
const Row = ({ row, selected, onOpen }: { row: MailRow; selected: boolean; onOpen: () => void }) => {
  const { select } = useMailSelection();
  const m = row.message;
  // Muted text follows the selection fill.
  const soft = cn("text-muted-foreground", selected && "group-focus-within/list:text-primary-foreground/75");

  const body = (
    <button
      type="button"
      data-selected={selected}
      onClick={() => select({ kind: row.kind, id: row.id })}
      onDoubleClick={onOpen}
      className={cn(
        "grid w-full grid-cols-[1rem_1fr] gap-x-1.5 rounded-lg px-2 py-2 text-left outline-none",
        selected
          ? "bg-muted group-focus-within/list:bg-primary group-focus-within/list:text-primary-foreground"
          : "hover:bg-muted/50",
      )}
    >
      <div className="flex flex-col items-center gap-1.5 pt-1.5">
        {row.unread && (
          <span className={cn("size-2.5 rounded-full bg-primary", selected && "group-focus-within/list:bg-primary-foreground")} />
        )}
        {row.flagged && (
          <Flag
            className={cn("size-3 fill-current text-primary", selected && "group-focus-within/list:text-primary-foreground")}
            aria-label="Flagged"
          />
        )}
      </div>
      <div className="flex min-w-0 flex-col">
        <div className="flex items-baseline gap-1.5">
          <span className={cn("min-w-0 truncate text-[13px]", row.unread ? "font-semibold" : "font-medium")}>{row.from}</span>
          {row.count > 1 && (
            <span className={cn("shrink-0 rounded-full bg-current/10 px-1.5 text-[10px] font-medium leading-4", soft)}>
              {row.count}
            </span>
          )}
          <span className={cn("ml-auto flex shrink-0 items-center gap-1 text-xs", soft)}>
            {row.attachments && <Paperclip className="size-3" aria-label="Attachments" />}
            {formatMailDate(m.date)}
          </span>
        </div>
        <span className="truncate text-[13px]">{m.subject || "(no subject)"}</span>
        {m.snippet && <span className={cn("line-clamp-2 text-xs leading-snug", soft)}>{m.snippet}</span>}
      </div>
    </button>
  );

  // Right-click and drag act on what the row stands for: the conversation, or the lone mail.
  return row.kind === "thread" ? (
    <MailThread.Smart object={{ id: row.id, subject: m.subject }}>{body}</MailThread.Smart>
  ) : (
    <MailMessage.Smart object={m}>{body}</MailMessage.Smart>
  );
};

/**
 * A mailbox's mail: a title and count on top, then flat rows divided by
 * hairlines, newest first — one per conversation, or per mail for search. Click reads on the right, double-click opens
 * a page; ↑/↓ (j/k) walk, Delete moves the selected mail to Trash.
 */
export const MailList = ({
  title,
  subtitle,
  source,
  empty,
}: {
  title: string;
  subtitle?: string;
  source: MailSource;
  empty: MailEmpty;
}) => {
  const [limit, setLimit] = useState(PAGE);
  const pagination = { offset: 0, limit };
  const threadSource = source.kind === "threads" ? source : null;
  const messageSource = source.kind === "messages" ? source : null;

  const threads = useListThreadsQuery({
    variables: {
      filters: threadSource?.filters,
      pagination,
      inFolder: threadSource?.inFolder,
      inRole: threadSource?.inRole,
    },
    skip: !threadSource,
    fetchPolicy: "cache-and-network",
  });
  const count = useThreadsCountQuery({ variables: { filters: threadSource?.filters }, skip: !threadSource });
  const messages = useListMessagesQuery({
    variables: { filters: messageSource?.filters, ordering: messageSource?.ordering ?? [], pagination },
    skip: !messageSource,
    fetchPolicy: "cache-and-network",
  });

  const loaded = threadSource ? threads.data?.threads : messages.data?.messages;
  const loading = threadSource ? threads.loading : messages.loading;
  const rows = useMemo(
    () =>
      threadSource
        ? threads.data && rowsFromThreads(threads.data.threads)
        : messages.data && rowsFromMessages(messages.data.messages),
    [threadSource, threads.data, messages.data],
  );
  const total = count.data?.threadsCount;
  const line = [total != null ? `${total} ${total === 1 ? "conversation" : "conversations"}` : null, subtitle]
    .filter(Boolean)
    .join(" · ");
  const { selected, select } = useMailSelection();
  const navigate = useNavigate();
  const client = useKuvert();
  const container = useRef<HTMLDivElement>(null);

  const index = rows?.findIndex((r) => r.id === selected?.id && r.kind === selected?.kind) ?? -1;
  const open = (row: MailRow) =>
    navigate(row.kind === "thread" ? MailThread.linkBuilder(row.id) : MailMessage.linkBuilder(row.id));
  const selectAt = (i: number) => {
    const row = rows?.[i];
    if (!row) return;
    select({ kind: row.kind, id: row.id });
    container.current?.querySelector(`[data-mail-row="${CSS.escape(row.id)}"]`)?.scrollIntoView({ block: "nearest" });
  };

  const onKeyDown = async (event: React.KeyboardEvent) => {
    if (!rows?.length) return;
    if (["ArrowDown", "j"].includes(event.key)) {
      event.preventDefault();
      selectAt(Math.min(rows.length - 1, index + 1));
    } else if (["ArrowUp", "k"].includes(event.key)) {
      event.preventDefault();
      selectAt(Math.max(0, index - 1));
    } else if (event.key === "Enter" && index >= 0) {
      open(rows[index]);
    } else if ((event.key === "Backspace" || event.key === "Delete") && index >= 0) {
      event.preventDefault();
      const row = rows[index];
      try {
        const ids = row.kind === "thread" ? await threadMessages(client, [row.id]) : [row.id];
        await deleteMail(client, ids, false);
        const next = rows[index + 1] ?? rows[index - 1];
        select(next ? { kind: next.kind, id: next.id } : null);
      } catch (e) {
        toast.error((e as Error).message);
      }
    }
  };

  return (
    <div className="flex min-h-full flex-col">
      <div className="sticky top-0 z-10 bg-background/85 px-4 pb-2 pt-3 backdrop-blur">
        <h2 className="truncate text-lg font-bold leading-tight">{title}</h2>
        {line && <p className="truncate text-xs text-muted-foreground">{line}</p>}
      </div>
      {!rows ? (
        <div className="flex justify-center p-8">
          <Spinner className="size-5 text-muted-foreground" />
        </div>
      ) : rows.length === 0 ? (
        <Empty className="border-0">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Inbox />
            </EmptyMedia>
            <EmptyTitle>{empty.title}</EmptyTitle>
            {empty.description && <EmptyDescription>{empty.description}</EmptyDescription>}
          </EmptyHeader>
          {empty.action && <EmptyContent>{empty.action}</EmptyContent>}
        </Empty>
      ) : (
        <div ref={container} onKeyDown={onKeyDown} className="group/list flex flex-col px-2 pb-2">
          {rows.map((row, i) => {
            const isSelected = i === index;
            return (
              <React.Fragment key={row.id}>
                <div data-mail-row={row.id}>
                  <Row row={row} selected={isSelected} onOpen={() => open(row)} />
                </div>
                {i < rows.length - 1 && (
                  <div className={cn("ml-8 mr-2 h-px bg-border/70", (isSelected || i + 1 === index) && "invisible")} />
                )}
              </React.Fragment>
            );
          })}
          {(loaded?.length ?? 0) >= limit && (
            <Button variant="ghost" size="sm" className="mt-1 text-xs" disabled={loading} onClick={() => setLimit((l) => l + PAGE)}>
              {loading && <Spinner />}
              Load more
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
