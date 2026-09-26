import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/core/ui/empty";
import { Spinner } from "@/core/ui/spinner";
import { MailX } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { MailboxTreeDocument, ThreadFragment, useGetThreadQuery, useMarkMessagesReadMutation } from "../../api/graphql";
import { MailThread } from "../../linkers";
import { MessageView } from "../MessageView";
import { InlineReply } from "./InlineReply";
import { MailToolbar } from "./MailToolbar";
import { useMailSelection } from "./selection";

/** Opening a conversation marks its unread mail read, once per conversation. */
export const useMarkThreadRead = (thread: ThreadFragment | undefined) => {
  const [markRead] = useMarkMessagesReadMutation({ refetchQueries: [MailboxTreeDocument] });
  const marked = useRef<string | null>(null);
  useEffect(() => {
    if (!thread || marked.current === thread.id) return;
    marked.current = thread.id;
    const unread = thread.messages.filter((m) => !m.isRead).map((m) => m.id);
    if (unread.length) void markRead({ variables: { input: { messages: unread, read: true } } });
  }, [thread?.id]);
};

/**
 * A conversation's mail as cards, oldest first: the newest and any unread
 * ones open, the rest folded to a line (click to open).
 */
export const ThreadMessages = ({ thread }: { thread: ThreadFragment }) => {
  const messages = thread.messages;
  const [open, setOpen] = useState<Set<string>>(
    () => new Set(messages.filter((m, i) => !m.isRead || i === messages.length - 1).map((m) => m.id)),
  );
  const toggle = (id: string) =>
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <>
      {messages.map((m) => (
        <MessageView key={m.id} message={m} open={open.has(m.id)} onToggle={() => toggle(m.id)} />
      ))}
    </>
  );
};

/** Loading, or gone (archived elsewhere, deleted), for a reading pane. */
export const ReaderState = ({ loading, what }: { loading: boolean; what: string }) =>
  loading ? (
    <div className="flex h-full items-center justify-center">
      <Spinner className="size-5 text-muted-foreground" />
    </div>
  ) : (
    <Empty className="h-full border-0">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <MailX />
        </EmptyMedia>
        <EmptyTitle>This {what} is gone</EmptyTitle>
        <EmptyDescription>It was moved or deleted.</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );

/** The page behind the cards: a soft canvas, the content in a readable column. */
export const ReaderCanvas = ({
  toolbar,
  title,
  meta,
  children,
}: {
  toolbar: React.ReactNode;
  title: string;
  meta?: React.ReactNode;
  children: React.ReactNode;
}) => (
  <div className="flex min-h-full flex-col bg-muted/40">
    {toolbar}
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-3 px-4 pb-6 pt-5">
      <header className="px-1 pb-1">
        <h1 className="text-2xl font-semibold leading-tight tracking-tight">{title || "(no subject)"}</h1>
        {meta && <p className="mt-1 text-xs text-muted-foreground">{meta}</p>}
      </header>
      {children}
    </div>
  </div>
);

/** The reading pane for a conversation: toolbar, subject, its mail as cards, a quick reply. */
export const ThreadReader = ({ id }: { id: string }) => {
  const { data, loading } = useGetThreadQuery({ variables: { id } });
  const { select } = useMailSelection();
  const thread = data?.thread;
  useMarkThreadRead(thread);

  if (!thread) return <ReaderState loading={loading} what="conversation" />;

  const last = thread.messages[thread.messages.length - 1];
  return (
    <ReaderCanvas
      title={thread.subject}
      meta={`${thread.messageCount} ${thread.messageCount === 1 ? "mail" : "mails"} · ${thread.account.emailAddress}`}
      toolbar={
        <MailToolbar
          messages={thread.messages.map((m) => m.id)}
          newest={last}
          canSend={thread.account.canSend}
          page={MailThread.linkBuilder(thread.id)}
          menu={<MailThread.ObjectButton object={thread} />}
          onGone={() => select(null)}
        />
      }
    >
      <ThreadMessages thread={thread} />
      {last && thread.account.canSend && <InlineReply key={last.id} message={last} />}
    </ReaderCanvas>
  );
};
