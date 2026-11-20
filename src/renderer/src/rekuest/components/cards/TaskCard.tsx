import React from "react";
import { ArrowRight, ListChecks } from "lucide-react";
import { Link } from "react-router-dom";
import { ObjectButton } from "@/core/smart/extensions/context";
import { StructureDisplay } from "@/core/smart/display/StructureDisplay";
import { smartRegistry } from "@/core/smart/registry";
import { CARD_FRAME_WIDE_SIZE, CardFrame, StatusPill, type CardStatus } from "@/core/ui/card-frame";
import Timestamp from "@/core/ui/timestamp";
import { RekuestTask } from "@/core/linkers";
import { cn } from "@/core/util/utils";
import { ListTaskFragment } from "../../api/graphql";
import {
  TaskStatusBucket,
  statusBucket,
  statusTheme,
} from "../../lib/taskStatus";
import { formatDuration } from "../../lib/taskTimeline";
import { firstReturnedStructure } from "../../lib/firstReturn";
import { ActionMonogram } from "../logo/ActionMonogram";
import { BlokLogo } from "../logo/BlokLogo";

interface Props {
  item: ListTaskFragment;
}


/** The colour of each state's pill (`StatusPill`). */
const STATUS_TONE: Record<TaskStatusBucket, CardStatus["tone"]> = {
  running: "live",
  queued: "idle",
  done: "good",
  error: "failed",
  lost: "attention",
  held: "attention",
  paused: "attention",
  cancelled: "idle",
};

/** A finished run older than this steps back, so live and failed ones stand out. */
const SETTLED_MS = 24 * 60 * 60 * 1000;

/**
 * A run, small, in the card frame the Mikro home and the agent cards share,
 * untinted, with the action's logo large and faint behind it: the action's
 * name and, under it, where it ran; what it last said (why a failed one
 * failed, how a finished one ended: "Successfully done" when it said nothing)
 * and a live run's progress; on hover, the first structure a finished run
 * returned, to open or act on; and at the foot when it started, with
 * its state as a pill at the bottom right (green done with how long it took,
 * yellow held, red failed, grey queued, pulsing while running with its
 * progress). A run that finished more than a day ago steps back. The whole
 * card opens the task.
 */
const TheCard = ({ item }: Props) => {
  const bucket = statusBucket(item.latestEventKind, item.isDone);
  const live = bucket === "running" || bucket === "queued";
  const failed = bucket === "error";
  const label = bucket === "running" ? "Running" : statusTheme(item).label;

  // The server keeps both as events are recorded; the three events the
  // fragment still carries are the fallback for a task written before that.
  const progress = live
    ? (item.latestProgress ?? item.events.find((e) => e.progress != null)?.progress)
    : undefined;
  // What it last said: the most useful line of a live or failed run, and how
  // a finished one ended ("Successfully done" when it said nothing).
  const said = item.latestMessage ?? item.events.find((e) => e.message)?.message;
  const message = bucket === "done" ? (said ?? "Successfully done") : live || failed ? said : undefined;
  // What a finished run made, to open or act on from its card.
  const made = bucket === "done" ? firstReturnedStructure(item.action.returns, item.latestReturns) : null;
  const madePath = made ? smartRegistry.buildModelPath(made.identifier, made.id) : undefined;
  const tookMs = item.finishedAt
    ? new Date(item.finishedAt).getTime() - new Date(item.createdAt).getTime()
    : undefined;

  const logo = item.action.logo;
  const settled =
    (bucket === "done" || bucket === "cancelled") &&
    !!item.finishedAt &&
    Date.now() - new Date(item.finishedAt).getTime() > SETTLED_MS;

  return (
    <RekuestTask.Smart object={item} className={`${CARD_FRAME_WIDE_SIZE} [container-type:normal]!`}>
      <CardFrame
        // Untinted: the state pill is the only colour on a task.
        tone="plain"
        quiet={settled}
        watermark={logo ? <BlokLogo blok={logo} /> : <ListChecks strokeWidth={1.25} />}
        leading={
          <span className="flex size-5 shrink-0 items-center justify-center overflow-hidden rounded-md ring-1 ring-foreground/10">
            {logo ? (
              <BlokLogo blok={logo} className="size-full p-0.5" />
            ) : (
              <ActionMonogram name={item.action.name} className="size-full text-[8px]" />
            )}
          </span>
        }
        title={
          // Stretched over the card: the whole card opens the task.
          <RekuestTask.DetailLink object={item} className="min-w-0 truncate after:absolute after:inset-0 hover:underline">
            {item.action.name}
          </RekuestTask.DetailLink>
        }
        // Where it ran, as the name's line.
        facts={[item.agent?.name ?? "No app yet"]}
      >
        <div className="flex h-full min-h-0 flex-col gap-1 px-1">
          {/* What a live run last said, or why a failed one failed. */}
          {message && (
            <p
              className={cn(
                "line-clamp-2 text-xs leading-snug",
                failed ? "text-destructive" : "text-muted-foreground",
              )}
              title={message}
            >
              {message}
            </p>
          )}
          {live && progress != null && (
            <div className="h-1 w-full overflow-hidden rounded-full bg-muted" aria-hidden>
              <div
                className="h-full rounded-full bg-primary/70 transition-[width] duration-700 ease-out motion-reduce:transition-none"
                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              />
            </div>
          )}
          {/* On hover, what a finished run made: open it, or act on it. Above
              the stretched link, so it is its own click. */}
          {made && (
            <div className="relative z-10 flex min-w-0 items-center gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover/frame:opacity-100">
              <ArrowRight className="size-3 shrink-0 text-muted-foreground" aria-hidden />
              {madePath ? (
                <Link to={`/${madePath.replace(/^\//, "")}`} className="min-w-0 truncate text-xs hover:underline">
                  <StructureDisplay identifier={made.identifier} id={made.id} variant="inline" fallback={made.id} />
                </Link>
              ) : (
                <span className="min-w-0 truncate text-xs">
                  <StructureDisplay identifier={made.identifier} id={made.id} variant="inline" fallback={made.id} />
                </span>
              )}
              <ObjectButton objects={[made]} className="ml-auto h-5 w-5 shrink-0" />
            </div>
          )}
          {/* The foot: when it started, and its state at the bottom right. */}
          <div className="mt-auto flex min-w-0 items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="min-w-0 truncate" title="Started">
              <Timestamp date={item.createdAt} relative />
            </span>
            <span className="ml-auto shrink-0">
              <StatusPill tone={STATUS_TONE[bucket]}>
                {label}
                {live && progress != null && <span className="tabular-nums"> {progress}%</span>}
                {!live && tookMs != null && <span className="tabular-nums"> · {formatDuration(tookMs)}</span>}
              </StatusPill>
            </span>
          </div>
        </div>
      </CardFrame>
    </RekuestTask.Smart>
  );
};

export default React.memo(TheCard);
