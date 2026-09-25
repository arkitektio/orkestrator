import React from "react";
import { Card } from "@/core/components/ui/card";
import { Progress } from "@/core/components/ui/progress";
import Timestamp from "@/core/components/ui/timestamp";
import { RekuestAgent, RekuestTask } from "@/core/linkers";
import { ListTaskFragment } from "../../api/graphql";
import {
  TaskStatusIcon,
  statusBucket,
  statusTheme,
} from "../../lib/taskStatus";
import { formatDuration } from "../../lib/taskTimeline";

interface Props {
  item: ListTaskFragment;
}

const TheCard = ({ item }: Props) => {
  const bucket = statusBucket(item.latestEventKind, item.isDone);
  const theme = statusTheme(item);
  const live = bucket === "running" || bucket === "queued";

  // `events` is newest-first, so the first hit is the latest value.
  const progress = live
    ? item.events.find((e) => e.progress != null)?.progress
    : undefined;
  // A finished task's last message is just noise ("done"); a live or failed
  // one is the most useful line on the card.
  const message =
    live || bucket === "error"
      ? item.events.find((e) => e.message)?.message
      : undefined;
  const tookMs = item.finishedAt
    ? new Date(item.finishedAt).getTime() - new Date(item.createdAt).getTime()
    : undefined;

  return (
    <RekuestTask.Smart object={item} hover>
      <Card className="flex h-full flex-col gap-1.5 p-3">
        <div className="flex items-baseline justify-between gap-2">
          <RekuestTask.DetailLink
            object={item}
            className="min-w-0 truncate text-sm font-medium leading-tight hover:text-primary transition-colors"
          >
            {item.action.name}
          </RekuestTask.DetailLink>
          <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
            <TaskStatusIcon
              kind={item.latestEventKind}
              isDone={item.isDone}
              className="h-3 w-3 shrink-0"
            />
            {theme.label}
          </span>
        </div>

        {item.agent && (
          <RekuestAgent.DetailLink
            object={item.agent}
            className="truncate text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {item.agent.name}
          </RekuestAgent.DetailLink>
        )}

        {progress != null && (
          <div className="flex items-center gap-2">
            <Progress value={progress} className="h-1 flex-1" />
            <span className="text-[10px] tabular-nums text-muted-foreground">
              {progress}%
            </span>
          </div>
        )}

        {message && (
          <p className="line-clamp-2 text-xs text-muted-foreground" title={message}>
            {message}
          </p>
        )}

        <div className="mt-auto flex items-center justify-between gap-2 pt-1 text-xs text-muted-foreground/60">
          <Timestamp date={item.createdAt} relative />
          {tookMs != null && (
            <span className="tabular-nums" title="Duration">
              {formatDuration(tookMs)}
            </span>
          )}
        </div>
      </Card>
    </RekuestTask.Smart>
  );
};

export default React.memo(TheCard);
