import { KraphTodoItem } from "@/core/linkers";
import { structure } from "@/core/smart/structure";
import { StructureDisplay } from "@/core/smart/display/StructureDisplay";
import type { Object } from "@/core/types";
import { Button } from "@/core/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/core/ui/popover";
import { cn } from "@/core/util/utils";
import { TodoStatus } from "@/kraph/api/graphql";
import { AddToTodoFields } from "@/kraph/forms/todos/AddToTodoForm";
import { dueState, formatDue, todoStatusLabel } from "@/kraph/lib/todos";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { Clock, ListPlus, ListTodo } from "lucide-react";
import React from "react";
import { STATUS_ICON, STATUS_RING } from "@/kraph/lib/todoStatus";
import { DoneAndNextButton } from "./DoneAndNextButton";
import { TodoDue } from "./TodoDue";
import { TodoStatusControl } from "./TodoStatusControl";
import { Track, TrackRow, useIsMine, useTodoTracks } from "./TodoTrack";
import { useTodoLive } from "./useTodoLive";

/** How many open items get their own chip in the bar; the rest are in the popover. */
const INLINE = 5;

/** The folded chip: one avatar. */
const FOLDED = 28;

/** How long the pointer may be gone before the chip folds again. */
const FOLD_DELAY = 150;

/** Over the blurred avatar: lighter behind the disc, enough further right to read text on. */
const SCRIM =
  "linear-gradient(to right, color-mix(in oklab, var(--background) 35%, transparent) 1.75rem, " +
  "color-mix(in oklab, var(--background) 72%, transparent) 3.5rem, " +
  "color-mix(in oklab, var(--background) 82%, transparent))";

const SPRING = { type: "spring", stiffness: 520, damping: 38, mass: 0.7 } as const;

/**
 * Open as long as the pointer is on it, or keyboard focus is inside it
 * (`:focus-visible`, so a click does not pin it open), with a short grace
 * period so passing between the chip's buttons does not fold it.
 */
const useUnfold = () => {
  const [hovered, setHovered] = React.useState(false);
  const [focused, setFocused] = React.useState(false);
  const timer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  React.useEffect(() => () => clearTimeout(timer.current), []);

  const enter = () => {
    clearTimeout(timer.current);
    setHovered(true);
  };
  const leave = () => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setHovered(false), FOLD_DELAY);
  };

  return {
    open: hovered || focused,
    handlers: {
      onPointerEnter: enter,
      onPointerLeave: leave,
      onFocus: (event: React.FocusEvent<HTMLElement>) => {
        if (event.target.matches(":focus-visible")) setFocused(true);
      },
      onBlur: (event: React.FocusEvent<HTMLElement>) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false);
      },
    },
  };
};

/**
 * One open item in the bar. Folded, it is the assignee's avatar in a ring the
 * colour of how far this object is. Unfolded (hover or keyboard focus), the
 * avatar becomes the pill's background and the item slides in: its title, and
 * Doing / Done when it is yours (someone else's: their status). Pressing Done
 * makes the chip leave the bar; the item stays in the popover.
 */
const TrackChip = ({ track }: { track: Track }) => {
  const mine = useIsMine(track);
  const { item, own } = track;
  const { open, handlers } = useUnfold();
  const Icon = STATUS_ICON[own.status];
  const assignee = item.effectiveAssignee;
  const due = dueState(item.effectiveDueAt, own.status);
  const label = [item.title, todoStatusLabel(own.status), item.effectiveDueAt && due ? formatDue(item.effectiveDueAt) : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.6, width: 0 }}
      animate={{ opacity: 1, scale: 1, width: open ? "auto" : FOLDED }}
      exit={{ opacity: 0, scale: 0.6, width: 0, marginRight: -6 }}
      transition={SPRING}
      className="relative shrink-0"
      {...handlers}
    >
      {/* Late: the ring pulses outward (not under reduced motion). */}
      {due === "overdue" && (
        <span aria-hidden className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-destructive motion-safe:animate-ping" />
      )}
      {/* Due within a day: a small clock on the ring. */}
      {due === "soon" && (
        <span aria-hidden className="pointer-events-none absolute -right-1 -top-1 z-10 flex size-3.5 items-center justify-center rounded-full bg-warning text-warning-foreground ring-2 ring-background">
          <Clock className="size-2.5" />
        </span>
      )}
      <div
        className={cn(
          "relative isolate flex h-7 min-w-7 items-center overflow-hidden rounded-full bg-muted ring-2 transition-[box-shadow] duration-300",
          STATUS_RING[own.status],
        )}
        title={open ? undefined : label}
        role="group"
        aria-label={label}
        // A keyboard way in while folded: focusing the pill unfolds it.
        tabIndex={0}
      >
        {/* Unfolded, the assignee's picture spreads blurred behind the whole pill. */}
        {assignee && (
          <motion.span
            aria-hidden
            className="absolute inset-0 overflow-hidden"
            initial={false}
            animate={{ opacity: open ? 0.55 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <StructureDisplay
              identifier="@lok/user"
              id={assignee}
              variant="avatar"
              className="absolute inset-0 size-full scale-150 rounded-none blur-md after:hidden [&>*]:rounded-none [&>[data-slot=avatar-fallback]]:hidden"
            />
          </motion.span>
        )}

        {/* Keeps the text legible over it. */}
        <motion.span
          aria-hidden
          className="absolute inset-0"
          style={{ backgroundImage: SCRIM }}
          initial={false}
          animate={{ opacity: open ? 1 : 0 }}
          transition={{ duration: 0.18 }}
        />

        {/* Who it is for, always crisp at the left: the whole chip when folded. */}
        {assignee ? (
          <StructureDisplay
            identifier="@lok/user"
            id={assignee}
            variant="avatar"
            className={cn(
              "absolute left-0 top-0 size-7 after:hidden [&>[data-slot=avatar-fallback]]:text-[0.6rem]",
              // An item without its own assignee is its list's: faded, as elsewhere.
              !item.assignee && "opacity-70",
            )}
          />
        ) : (
          <span className="absolute left-0 top-0 flex size-7 items-center justify-center text-[0.65rem] text-muted-foreground">
            ?
          </span>
        )}

        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              key="content"
              className="relative flex min-w-0 items-center gap-1.5 py-0.5 pl-8 pr-0.5"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8, transition: { duration: 0.1 } }}
              transition={{ ...SPRING, delay: 0.04 }}
            >
              <KraphTodoItem.DetailLink
                object={item}
                className="max-w-44 truncate whitespace-nowrap text-xs font-medium text-foreground hover:underline"
              >
                {item.title}
              </KraphTodoItem.DetailLink>
              <TodoDue due={item.effectiveDueAt} status={own.status} inherited={!item.dueAt} className="text-[0.65rem]" />
              {mine ? (
                // A Done chip leaves the bar: Undo brings it back.
                <div className="flex items-center gap-0.5">
                  <TodoStatusControl structure={own} item={item} variant="icons" options={{ undoable: true }} />
                  <DoneAndNextButton structure={own} item={item} />
                </div>
              ) : (
                <span className="flex shrink-0 items-center gap-1 whitespace-nowrap pr-1.5 text-[0.65rem] text-muted-foreground">
                  <Icon className="size-3" />
                  {todoStatusLabel(own.status)}
                </span>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

/**
 * The object's todo track beside every datum page's breadcrumbs (the host's
 * "pagebar" slot): each open item it is on as an unfolding chip, and a button
 * that opens every item in a popover, done ones included (the only place they
 * still show), together with adding the object to another one.
 */
export const TodoPageTrack = ({ identifier, object }: { identifier: string; object: Object }) => {
  const id = String(object.id);
  const tracks = useTodoTracks(identifier, id);
  // A colleague's Done, or this object put on a new item, shows without a reload.
  useTodoLive();
  const [open, setOpen] = React.useState(false);

  const label = typeof object.label === "string" ? object.label : typeof object.name === "string" ? object.name : undefined;
  const structures = React.useMemo(() => [structure(identifier, id, { label })], [identifier, id, label]);

  // Kept in the query's order, not sorted by status: a chip must not jump
  // away from under the pointer when its Doing is pressed.
  const openTracks = React.useMemo(() => tracks.filter(({ own }) => own.status !== TodoStatus.Done), [tracks]);
  const doneTracks = React.useMemo(() => tracks.filter(({ own }) => own.status === TodoStatus.Done), [tracks]);
  const hidden = openTracks.length - INLINE;

  return (
    <MotionConfig reducedMotion="user">
      <div className="flex items-center gap-1.5 p-0.5">
        <AnimatePresence initial={false}>
          {openTracks.slice(0, INLINE).map((track) => (
            <TrackChip key={track.item.id} track={track} />
          ))}
        </AnimatePresence>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative size-7 rounded-full"
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
            {openTracks.length > 0 && (
              <div className="flex flex-col gap-2">
                <h3 className="text-sm font-semibold">Todo</h3>
                {openTracks.map((track) => (
                  <TrackRow key={track.item.id} track={track} />
                ))}
              </div>
            )}
            {doneTracks.length > 0 && (
              <div className="flex flex-col gap-2">
                <h3 className="text-sm font-semibold text-muted-foreground">Done</h3>
                {doneTracks.map((track) => (
                  <div key={track.item.id} className="opacity-70 transition-opacity hover:opacity-100">
                    <TrackRow track={track} />
                  </div>
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
    </MotionConfig>
  );
};
