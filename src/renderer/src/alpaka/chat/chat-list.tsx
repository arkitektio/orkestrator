import {
  ListMessageFragment,
  StructureInput,
} from "@/alpaka/api/graphql";
import { Card, CardContent } from "@/components/ui/card";
import { useResolve } from "@/datalayer/hooks/useResolve";
import { cn } from "@/lib/utils";
import { useMeQuery } from "@/lok/api/graphql";
import { PortKind } from "@/rekuest/api/graphql";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Loader2, CheckCircle2, AlertCircle, XCircle, X, Ban, RefreshCw } from "lucide-react";
import { agentDisplayName, displayInitials } from "@/alpaka/agentName";
import { ActiveTask } from "./activeTasks";
import { isUnconfirmed, settlePending, type PendingMessage } from "./pendingMessages";
import React, { useCallback, useRef } from "react";
import { useLatestRef } from "@/hooks/useLatestRef";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DelegatingStructureWidget } from "@/components/ports/returns/DelegatingStructureWidget";
import ChatBottombar from "./chat-bottombar";
import { Markdown } from "@/components/ui/markdown";

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
  /** Only your own rows have a picture; everyone else gets their initials. */
  avatarSrc?: string;
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
  avatarSrc,
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
      <Avatar
        size="lg"
        className={cn(
          "relative border shadow-sm",
          isOwn ? "bg-background" : "bg-muted/60",
        )}
        title={senderName}
      >
        {avatarSrc && <AvatarImage src={avatarSrc} alt={senderName} />}
        <AvatarFallback
          className={cn(
            "bg-muted/60 text-xs font-semibold",
            isOwn ? "text-foreground/70" : "text-muted-foreground",
          )}
        >
          {senderInitials}
        </AvatarFallback>
      </Avatar>
    </motion.div>
  );

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
              {message.text && <Markdown text={message.text} />}
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
                      <DelegatingStructureWidget
                        port={{
                          kind: PortKind.Structure,
                          identifier: s.identifier,
                          __typename: "ReturnPort",
                          key: structureIndex.toString(),
                          nullable: false,
                        }}
                        value={s}
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
  const { data: meData } = useMeQuery();
  const resolve = useResolve();

  // The parent passes a fresh `onRereply` closure every render; route it
  // through a ref so the memoised rows only see a stable identity (and
  // `undefined` when rereply is disabled, which hides the button).
  const onRereplyRef = useLatestRef(onRereply);
  const stableRereply = useCallback(
    (messageId: string) => onRereplyRef.current?.(messageId),
    [onRereplyRef],
  );
  const rereplyHandler = onRereply ? stableRereply : undefined;

  const username = meData?.me?.username;
  const ownName = username || "You";
  const ownAvatarSrc = resolve(meData?.me?.profile?.avatar?.presignedUrl);
  const ownInitials = displayInitials(username, "YO");

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
              id: meData?.me?.id ?? "",
              preferredUsername: username ?? "",
            },
          },
        } satisfies ListMessageFragment,
      })),
    [pendingMessages, messages, currentAgentName, meData?.me?.id, username],
  );

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
  }, [messages, pendingMessages, prefersReducedMotion]);

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
                avatarSrc={isOwn ? ownAvatarSrc : undefined}
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
              avatarSrc={ownAvatarSrc}
              isPending={isUnconfirmed(pending)}
            />
          ))}
          </AnimatePresence>
        </div>
      </div>
      <div className="sticky bottom-0 px-3">
        <div className="relative">
        {activeTasks.length > 0 && (
          <div className="absolute inset-x-0 bottom-full z-10 mb-1 flex flex-col gap-2 px-1">
            <AnimatePresence>
              {activeTasks.map((ass) => (
                <motion.div
                  key={ass.reference}
                  initial={{ opacity: 0, y: 15, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-2xl border px-4 py-2 text-xs shadow-md backdrop-blur-md transition-colors",
                    ass.status === "DONE" && "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-300",
                    ass.status === "ERROR" && "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300",
                    ass.status === "CANCELLED" && "border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-300",
                    (ass.status === "RUNNING" || ass.status === "PENDING") && "border-primary/20 bg-primary/5 text-primary-foreground/90 dark:text-primary"
                  )}
                >
                  {/* Status Indicator Icon */}
                  <div className="flex items-center justify-center shrink-0">
                    {(ass.status === "PENDING" || ass.status === "RUNNING") && (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-current" />
                    )}
                    {ass.status === "DONE" && (
                      <CheckCircle2 className="h-3.5 w-3.5 text-current" />
                    )}
                    {ass.status === "ERROR" && (
                      <AlertCircle className="h-3.5 w-3.5 text-current" />
                    )}
                    {ass.status === "CANCELLED" && (
                      <XCircle className="h-3.5 w-3.5 text-current" />
                    )}
                  </div>

                  {/* Main Content */}
                  <div className="flex-1 min-w-0 flex items-center gap-2">
                    <span className="font-semibold text-foreground truncate max-w-[150px] sm:max-w-[250px] flex items-center gap-1.5">
                      <span className="truncate">{ass.actionName}</span>
                      {ass.delegatedName && (
                        <span className="text-muted-foreground font-normal text-[10px] bg-muted/70 dark:bg-muted/30 border border-muted-foreground/10 px-1.5 py-0.5 rounded-full shrink-0">
                          {ass.delegatedName}
                        </span>
                      )}
                    </span>
                    {ass.message && (
                      <span className="text-muted-foreground truncate font-light text-[11px]">
                        • {ass.message}
                      </span>
                    )}
                  </div>

                  {/* Progress bar or percentage */}
                  {ass.progress !== undefined && ass.progress !== null && (
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] font-mono font-semibold text-muted-foreground">
                        {Math.round(ass.progress)}%
                      </span>
                      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted/50 border border-muted-foreground/10">
                        <div
                          className="h-full bg-primary/80 transition-all duration-300 rounded-full"
                          style={{ width: `${Math.round(ass.progress)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Close/Cancel Button */}
                  {ass.status === "PENDING" || ass.status === "RUNNING" ? (
                    <button
                      type="button"
                      disabled={!ass.id}
                      onClick={() => ass.id && onCancelTask?.(ass.id, ass.reference)}
                      className="rounded-full p-1 hover:bg-red-500/20 text-muted-foreground hover:text-red-500 transition-colors shrink-0 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
                      title="Cancel Replyer"
                    >
                      <Ban className="h-3 w-3" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onDismissTask?.(ass.reference)}
                      className="rounded-full p-1 hover:bg-muted/20 text-muted-foreground hover:text-foreground transition-colors shrink-0"
                      title="Dismiss"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
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
