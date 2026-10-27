import {
  ListMessageFragment,
  StructureInput,
} from "@/alpaka/api/graphql";
import { Card, CardContent } from "@/core/ui/card";
import { cn } from "@/core/util/utils";
import { useSelf } from "@/core/connection/useSelf";
import { StructureDisplay } from "@/core/smart/display/StructureDisplay";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Loader2, AlertCircle, XCircle, X, RefreshCw, Hand } from "lucide-react";
import { agentDisplayName, displayInitials } from "@/alpaka/agentName";
import { ActiveTask, isLive } from "./activeTasks";
import { HoldCard, HoldDecisionLine } from "@/rekuest/components/task/HoldCard";
import type { HoldRequest, TaskInform } from "@/rekuest/lib/holds";
import { MaterializedBlokEmbedById } from "@/rekuest/components/MaterializedBlokEmbed";
import { isUnconfirmed, settlePending, type PendingMessage } from "./pendingMessages";
import React, { useCallback, useRef } from "react";
import { useLatestRef } from "@/core/util/hooks/useLatestRef";
import { Avatar, AvatarFallback } from "@/core/ui/avatar";
import ChatBottombar from "./chat-bottombar";
import { Markdown, type CodeRenderers } from "@/core/ui/markdown";

/** A ```bsx fence in a message is a blok draft (the blok assistant streams one): drawn as a live preview. */
const BsxDraftPreview = React.lazy(() => import("@/rekuest/components/BsxDraftPreview"));
const CODE_RENDERERS: CodeRenderers = {
  bsx: (content) => (
    <React.Suspense fallback={null}>
      <BsxDraftPreview source={content} />
    </React.Suspense>
  ),
};

interface ChatListProps {
  messages?: ListMessageFragment[];
  /** The name this client joined the room under — its messages are "yours". */
  currentAgentName: string;
  sendMessage: (message: string) => void;
  isMobile: boolean;
  stagedStructures: StructureInput[];
  onRemoveStructure: (index: number) => void;
  prefillText?: string;
  activeTasks?: ActiveTask[];
  onDismissTask?: (reference: string) => void;
  onCancelTask?: (id: string, reference: string) => void;
  onRereply?: (messageId: string) => void;
  replyerControl?: React.ReactNode;
  /** Sent, not yet delivered back by the room. Rendered after `messages`. */
  pendingMessages?: readonly PendingMessage[];
}

// Module-level formatter: `toLocaleTimeString` builds a fresh Intl formatter
// per call, which is far too expensive for a list that rerenders at several
// Hz while tasks stream progress.
const TIME_FORMAT = new Intl.DateTimeFormat([], {
  hour: "2-digit",
  minute: "2-digit",
});

/** How far from the bottom a reader may be and still be followed down. */
const STICK_TO_BOTTOM_PX = 120;

const formatMessageTime = (iso: string) => {
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? "" : TIME_FORMAT.format(ms);
};

interface ChatMessageProps {
  message: ListMessageFragment;
  isOwn: boolean;
  senderName: string;
  senderInitials: string;
  /**
   * Only your own rows have a picture (the member's avatar, drawn by lok's
   * display); everyone else gets their initials.
   */
  ownAvatar?: React.ReactNode;
  /** Sent but not acknowledged yet: the bubble pulses until it is real. */
  isPending?: boolean;
  /**
   * Ties a pending row to the real message that replaces it. Both carry the
   * server's id, so framer hands one over to the other in place instead of
   * animating one out and the other back in.
   */
  layoutId?: string;
  /** Stable callback (identity must not change per render) or undefined. */
  onRereply?: (messageId: string) => void;
}

/** Three dots that keep bouncing while a reply is still being written. */
const StreamingDots = ({ className }: { className?: string }) => (
  <span className={cn("inline-flex items-center gap-1 py-1", className)}>
    {[0, 1, 2].map((index) => (
      <motion.span
        key={index}
        className="h-1.5 w-1.5 rounded-full bg-current"
        initial={{ opacity: 0.25 }}
        animate={{ opacity: [0.25, 1, 0.25], y: [0, -2.5, 0] }}
        transition={{
          duration: 1,
          repeat: Infinity,
          ease: "easeInOut",
          delay: index * 0.15,
        }}
      />
    ))}
  </span>
);

/**
 * One chat row. Memoised so the list can rerender on every subscription /
 * task-progress tick without re-parsing every message's markdown.
 */
const ChatMessage = React.memo(function ChatMessage({
  message,
  isOwn,
  senderName,
  senderInitials,
  ownAvatar,
  isPending = false,
  layoutId,
  onRereply,
}: ChatMessageProps) {
  const reduceMotion = useReducedMotion();
  const isStreaming = message.isStreaming;

  // Rows slide in from their own side, so where a message came from reads
  // before it has been looked at.
  const enter = reduceMotion
    ? { initial: { opacity: 0 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0, y: 14, scale: 0.97, x: isOwn ? 12 : -12 },
        exit: { opacity: 0, y: -6, scale: 0.98 },
      };

  const avatar = (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 500, damping: 30, delay: 0.04 }}
      className="relative mt-1 shrink-0"
    >
      {/* A halo, not a spinner: it marks the writer without pulling the eye
          away from the text appearing next to it. */}
      {isStreaming && !reduceMotion && (
        <motion.span
          className="absolute -inset-0.5 rounded-full bg-muted-foreground/20"
          animate={{ opacity: [0.5, 0, 0.5], scale: [1, 1.25, 1] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
      {ownAvatar ?? (
        <Avatar
          size="lg"
          className={cn(
            "relative border shadow-sm",
            isOwn ? "bg-background" : "bg-muted/60",
        )}
        title={senderName}
      >
        <AvatarFallback
          className={cn(
            "bg-muted/60 text-xs font-semibold",
            isOwn ? "text-foreground/70" : "text-muted-foreground",
          )}
        >
          {senderInitials}
        </AvatarFallback>
      </Avatar>
      )}
    </motion.div>
  );

  const attached = message.attachedStructures.map((s) => ({ identifier: s.identifier, id: String(s.object) }));

  return (
    <motion.div
      layoutId={layoutId}
      layout={reduceMotion ? false : "position"}
      initial={enter.initial}
      animate={{ opacity: 1, y: 0, scale: 1, x: 0 }}
      exit={enter.exit}
      transition={{
        type: "spring",
        stiffness: 420,
        damping: 34,
        mass: 0.7,
        opacity: { duration: 0.15 },
      }}
      className={cn(
        "flex w-full items-end gap-3",
        isOwn ? "justify-end" : "justify-start",
      )}
    >
      {!isOwn && avatar}
      <div className={cn("flex max-w-[85%] min-w-0 flex-col", isOwn && "items-end")}>
        <div className="relative group/msg w-full">
          <Card
            className={cn(
              // `Card`'s own ring and hover tint are dropped here: the tail
              // can only continue an outline the bubble actually has, and a
              // background that shifts on hover would leave the tail behind.
              "relative w-full overflow-hidden border border-border/60 shadow-sm ring-0 transition-shadow hover:shadow-md hover:ring-0",
              isOwn ? "bg-muted hover:bg-muted" : "bg-card hover:bg-card",
              isPending && !reduceMotion && "animate-pulse",
            )}
          >
            <CardContent className="space-y-3 p-3">
              {message.text && <Markdown text={message.text} codeRenderers={CODE_RENDERERS} />}
              {isStreaming && (
                <StreamingDots className="text-muted-foreground" />
              )}
              {message.attachedStructures.length > 0 && (
                <motion.div
                  initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08, duration: 0.2 }}
                  className={cn(
                    "space-y-2 rounded-xl border border-border/60 p-2",
                    // Inside a muted bubble a muted panel disappears, so the
                    // own side inverts: a lighter well instead of a darker one.
                    isOwn ? "bg-background/60" : "bg-muted/30",
                  )}
                >
                  {message.attachedStructures.map((s, structureIndex) => (
                    <div
                      key={`${message.id}-${s.identifier}-${s.object}-${structureIndex}`}
                      className="overflow-hidden rounded-lg"
                    >
                      <StructureDisplay
                        identifier={s.identifier}
                        id={String(s.object)}
                        small
                        // An agent may attach a blok to show next to what it posted.
                        variant="embed"
                        alongside={attached.filter((_, index) => index !== structureIndex)}
                      />
                    </div>
                  ))}
                </motion.div>
              )}

              {/* In flow rather than pinned to the corner: absolute, it would
                  overlap the last line of a wide message and overflow a
                  narrow one. `-mt-1` keeps it tucked under the text instead of
                  sitting a full gap below it. */}
              <div className="-mt-1 flex justify-end">
                <span className="select-none text-[10px] tabular-nums leading-none text-muted-foreground/50">
                  {formatMessageTime(message.createdAt)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* The tail: a square turned on its corner, half of it tucked under
              the card so only the two outer edges show and they continue the
              card's own outline. It sits on the side the avatar is on. */}
          <span
            aria-hidden
            className={cn(
              "absolute bottom-3 h-3 w-3 rotate-45 border-border/60",
              isOwn
                ? "-right-1.5 border-t border-r bg-muted"
                : "-left-1.5 border-b border-l bg-card",
            )}
          />

          {/* Rereply Hover Button */}
          {onRereply && (
            <div className="absolute left-2 top-2 z-10 -translate-x-1 opacity-0 transition-all duration-200 group-hover/msg:translate-x-0 group-hover/msg:opacity-100">
              <button
                type="button"
                onClick={() => onRereply(message.id)}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-border/60 bg-background text-muted-foreground shadow-xs transition-all hover:scale-105 hover:rotate-90 hover:bg-muted hover:text-foreground active:scale-95"
                title="Re-run selected replyer on this message"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
      {isOwn && avatar}
    </motion.div>
  );
});

/**
 * A hold, in the conversation where it was asked: from the agent that asks,
 * on its side, like its messages, so it is read in the flow of what that agent
 * is doing rather than found floating over the composer.
 */
const HoldRow = ({ hold }: { hold: HoldRequest }) => {
  const reduceMotion = useReducedMotion();
  const asker = hold.callerAgent?.name ?? "Agent";
  return (
    <motion.div
      layout={reduceMotion ? false : "position"}
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.97, x: -12 }}
      animate={{ opacity: 1, y: 0, scale: 1, x: 0 }}
      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.97, height: 0 }}
      transition={{ type: "spring", stiffness: 420, damping: 34, mass: 0.7, opacity: { duration: 0.15 } }}
      className="flex w-full items-end gap-3"
    >
      <Avatar size="lg" className="relative mt-1 shrink-0 border border-amber-500/40 bg-muted/60 shadow-sm" title={asker}>
        <AvatarFallback className="bg-amber-500/10 text-xs font-semibold text-amber-700 dark:text-amber-300">
          {displayInitials(asker, "AI")}
        </AvatarFallback>
      </Avatar>
      <div className="flex min-w-0 max-w-[85%] flex-1 flex-col">
        <HoldCard hold={hold} />
      </div>
    </motion.div>
  );
};

/**
 * A blok a replyer shows while it works (an inform): on its side, like its
 * messages, live; it carries on without waiting for anyone.
 */
const InformRow = ({ inform, asker }: { inform: TaskInform; asker: string }) => {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      layout={reduceMotion ? false : "position"}
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.97, x: -12 }}
      animate={{ opacity: 1, y: 0, scale: 1, x: 0 }}
      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.97, height: 0 }}
      transition={{ type: "spring", stiffness: 420, damping: 34, mass: 0.7, opacity: { duration: 0.15 } }}
      className="flex w-full items-end gap-3"
    >
      <Avatar size="lg" className="relative mt-1 shrink-0 border bg-muted/60 shadow-sm" title={asker}>
        <AvatarFallback className="bg-muted/60 text-xs font-semibold text-muted-foreground">
          {displayInitials(asker, "AI")}
        </AvatarFallback>
      </Avatar>
      <div className="flex min-w-0 max-w-[85%] flex-1 flex-col gap-1 rounded-2xl border border-border/60 bg-card p-3 shadow-sm">
        {inform.message && <div className="px-1 text-xs text-muted-foreground">{inform.message}</div>}
        <MaterializedBlokEmbedById id={inform.blok} />
      </div>
    </motion.div>
  );
};

/**
 * A replyer at work, as one quiet line where its answer will appear: what it is,
 * what it says it is doing, how far along. No box and no stack over the composer:
 * the answer, when it comes, is the message itself, so a finished run leaves no
 * line behind. A failure stays, small and red, until it is dismissed.
 */
export const TaskActivityRow = ({
  task,
  onCancel,
  onDismiss,
}: {
  task: ActiveTask;
  onCancel?: (id: string, reference: string) => void;
  onDismiss?: (reference: string) => void;
}) => {
  const reduceMotion = useReducedMotion();
  const live = isLive(task.status);
  const failed = task.status === "ERROR";
  const name = task.delegatedName ?? task.actionName;
  const detail =
    task.status === "HELD"
      ? "waiting for you"
      : task.status === "CANCELLED"
        ? "stopped"
        : task.message;
  return (
    <motion.div
      layout={reduceMotion ? false : "position"}
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className={cn(
        "group flex min-w-0 items-center gap-2 pl-[52px] text-[11px]",
        failed ? "text-red-600 dark:text-red-400" : "text-muted-foreground",
      )}
    >
      {task.status === "HELD" ? (
        <Hand className="h-3 w-3 shrink-0 text-amber-600 dark:text-amber-400" />
      ) : live ? (
        <Loader2 className="h-3 w-3 shrink-0 animate-spin motion-reduce:animate-none" />
      ) : failed ? (
        <AlertCircle className="h-3 w-3 shrink-0" />
      ) : (
        <XCircle className="h-3 w-3 shrink-0" />
      )}
      <span className="shrink-0 font-medium text-foreground/70">{name}</span>
      {detail && <span className="min-w-0 truncate">{detail}</span>}
      {live && task.progress != null && (
        <span className="shrink-0 tabular-nums">{Math.round(task.progress)}%</span>
      )}
      {live ? (
        task.id && (
          <button
            type="button"
            onClick={() => onCancel?.(task.id, task.reference)}
            className="shrink-0 rounded px-1 opacity-0 transition-opacity hover:text-red-500 focus-visible:opacity-100 group-hover:opacity-100"
            title="Stop this replyer"
          >
            Stop
          </button>
        )
      ) : (
        <button
          type="button"
          onClick={() => onDismiss?.(task.reference)}
          className="shrink-0 rounded p-0.5 opacity-60 transition-opacity hover:opacity-100"
          title="Dismiss"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </motion.div>
  );
};

export function ChatList({
  messages,
  currentAgentName,
  sendMessage,
  isMobile,
  stagedStructures,
  onRemoveStructure,
  prefillText,
  activeTasks = [],
  onDismissTask,
  onCancelTask,
  onRereply,
  replyerControl,
  pendingMessages = [],
}: ChatListProps) {
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const { userId, username: selfName } = useSelf();

  // The parent passes a fresh `onRereply` closure every render; route it
  // through a ref so the memoised rows only see a stable identity (and
  // `undefined` when rereply is disabled, which hides the button).
  const onRereplyRef = useLatestRef(onRereply);
  const stableRereply = useCallback(
    (messageId: string) => onRereplyRef.current?.(messageId),
    [onRereplyRef],
  );
  const rereplyHandler = onRereply ? stableRereply : undefined;

  const username = selfName ?? undefined;
  const ownName = username || "You";
  const ownInitials = displayInitials(username, "YO");
  const ownAvatar = userId ? (
    <StructureDisplay identifier="@lok/user" id={userId} variant="avatar" className="relative h-10 w-10 border shadow-sm" />
  ) : undefined;

  // The first paint lands at the bottom instantly; everything after glides,
  // so an arriving message is seen moving in rather than appearing already
  // scrolled past. Reading back is left alone: a user who scrolled up is not
  // yanked down by someone else's message.
  const hasScrolledOnce = useRef(false);
  // A pending row is a real message everywhere but its id: the same component
  // renders it, so it lands in the conversation looking exactly like what it
  // is about to become.
  const pendingRows = React.useMemo(
    () =>
      // Filtered here rather than left to the parent's effect: for the frame
      // between the room delivering a message and that effect running, both
      // rows would otherwise be on screen at once.
      settlePending(pendingMessages, messages ?? []).map((pending) => ({
        pending,
        message: {
          __typename: "Message" as const,
          id: pending.localId,
          text: pending.text,
          isStreaming: false,
          createdAt: pending.createdAt,
          attachedStructures: pending.attachedStructures.map((structure) => ({
            __typename: "Structure" as const,
            identifier: structure.identifier,
            object: structure.object,
          })),
          agent: {
            __typename: "Agent" as const,
            id: currentAgentName,
            name: currentAgentName,
            user: {
              __typename: "User" as const,
              id: userId ?? "",
              preferredUsername: username ?? "",
            },
          },
        } satisfies ListMessageFragment,
      })),
    [pendingMessages, messages, currentAgentName, userId, username],
  );

  // What the conversation shows of the replyers' holds: each one waiting, and
  // each one answered while its pill is up.
  const holdRows = activeTasks.flatMap((ass) => [
    ...(ass.decided ?? []).map((decided) => ({ key: `${ass.reference}:decided:${decided.task}`, decided, hold: null })),
    ...(ass.status === "HELD" ? (ass.holds ?? []) : []).map((hold) => ({
      key: `${ass.reference}:hold:${hold.task}`,
      decided: null,
      hold,
    })),
  ]);
  // What the replyers showed while they work, while their pill is up.
  const informRows = activeTasks.flatMap((ass) =>
    (ass.informs ?? []).map((inform) => ({ key: `${ass.reference}:inform:${inform.blok}`, inform, asker: ass.actionName })),
  );
  // What is still worth a line: a run at work, failed or stopped. A finished one
  // says nothing (its answer is in the conversation), and neither does one whose
  // hold card is there to say it waits.
  const activityRows = activeTasks.filter(
    (task) => task.status !== "DONE" && !(task.status === "HELD" && task.holds?.length),
  );
  // A new hold, or a run starting, is followed down to like a new message.
  const holdCount = holdRows.length + activityRows.length + informRows.length;

  React.useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    if (!hasScrolledOnce.current) {
      hasScrolledOnce.current = true;
      container.scrollTop = container.scrollHeight;
      return;
    }

    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    if (distanceFromBottom > STICK_TO_BOTTOM_PX) return;

    container.scrollTo({
      top: container.scrollHeight,
      behavior: prefersReducedMotion ? "auto" : "smooth",
    });
  }, [messages, pendingMessages, prefersReducedMotion, holdCount]);

  return (
    <div className="flex min-h-0 flex-col flex-1 h-full overflow-hidden">
      <div
        ref={messagesContainerRef}
        className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden"
      >
        <div className="flex flex-1 flex-col gap-3 px-3 py-4 sm:px-4">
          {messages?.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="flex flex-1 items-center justify-center text-center text-sm text-muted-foreground"
            >
              Start the conversation. Messages and attached structures will appear here.
            </motion.div>
          )}
          <AnimatePresence initial={false}>
          {messages?.map((message) => {
            // The room addresses agents by the name their client joined under,
            // but an agent also has a database id — match either, so a row is
            // recognised as yours whichever the server hands back.
            const isOwn =
              message.agent.name === currentAgentName ||
              message.agent.id === currentAgentName;
            const senderName = isOwn
              ? ownName
              : agentDisplayName(message.agent, "Unknown");
            return (
              <ChatMessage
                key={message.id}
                layoutId={message.id}
                message={message}
                isOwn={isOwn}
                senderName={senderName}
                senderInitials={
                  isOwn ? ownInitials : displayInitials(senderName, "AI")
                }
                ownAvatar={isOwn ? ownAvatar : undefined}
                onRereply={rereplyHandler}
              />
            );
          })}
          {pendingRows.map(({ pending, message }) => (
            <ChatMessage
              key={pending.localId}
              layoutId={pending.serverId ?? pending.localId}
              message={message}
              isOwn
              senderName={ownName}
              senderInitials={ownInitials}
              ownAvatar={ownAvatar}
              isPending={isUnconfirmed(pending)}
            />
          ))}
          {holdRows.map(({ key, hold, decided }) =>
            hold ? (
              <HoldRow key={key} hold={hold} />
            ) : (
              decided && (
                <motion.div
                  key={key}
                  layout={prefersReducedMotion ? false : "position"}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex justify-center"
                >
                  <HoldDecisionLine
                    hold={decided.hold}
                    decision={decided}
                    // An ask through a blok stays as the blok: it takes the width a message does.
                    className={decided.hold.blok ? "w-full max-w-[85%]" : "max-w-[85%]"}
                  />
                </motion.div>
              )
            ),
          )}
          {informRows.map(({ key, inform, asker }) => (
            <InformRow key={key} inform={inform} asker={asker} />
          ))}
          {activityRows.map((task) => (
            <TaskActivityRow
              key={`${task.reference}:activity`}
              task={task}
              onCancel={onCancelTask}
              onDismiss={onDismissTask}
            />
          ))}
          </AnimatePresence>
        </div>
      </div>
      <div className="sticky bottom-0 px-3">
        <div className="relative">
        <ChatBottombar
          sendMessage={sendMessage}
          isMobile={isMobile}
          stagedStructures={stagedStructures}
          onRemoveStructure={onRemoveStructure}
          prefillText={prefillText}
          replyerControl={replyerControl}
        />
        </div>
      </div>
    </div>
  );
}
