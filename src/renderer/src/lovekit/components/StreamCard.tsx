import React from "react";
import { Card } from "@/core/ui/card";
import { cn } from "@/core/util/utils";
import { LovekitStream } from "@/core/linkers";
import { ListStreamFragment, StreamKind } from "../api/graphql";
import { StreamerApp, StreamerName, StreamKindIcon, streamKindLabel } from "./streamer";

interface Props {
  item: ListStreamFragment;
  className?: string;
}

/** A stream: what it carries, who sends it, and from which app. */
const TheCard = ({ item, className }: Props) => {
  const audio = item.kind === StreamKind.Audio;
  return (
    <LovekitStream.Smart object={item}>
      <Card className={cn("flex h-full flex-col gap-1.5 p-3", className)}>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "flex size-7 shrink-0 items-center justify-center rounded-md",
              audio ? "bg-amber-500/10 text-amber-500" : "bg-sky-500/10 text-sky-500",
            )}
          >
            <StreamKindIcon kind={item.kind} />
          </span>
          <div className="flex min-w-0 flex-1 flex-col">
            <LovekitStream.DetailLink
              object={item}
              className="truncate text-sm font-medium leading-tight transition-colors hover:text-primary"
            >
              {item.title || `${streamKindLabel(item.kind)} stream`}
            </LovekitStream.DetailLink>
            <StreamerName streamer={item.streamer} className="text-xs text-muted-foreground" />
          </div>
        </div>

        <div className="mt-auto flex items-center justify-between gap-2 pt-1 text-xs text-muted-foreground/60">
          <StreamerApp streamer={item.streamer} />
          <span className="shrink-0">{streamKindLabel(item.kind)}</span>
        </div>
      </Card>
    </LovekitStream.Smart>
  );
};

export default React.memo(TheCard);
