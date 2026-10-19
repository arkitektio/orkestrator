import React from "react";
import { Card } from "@/core/ui/card";
import Timestamp from "@/core/ui/timestamp";
import { cn } from "@/core/util/utils";
import { LovekitSoloBroadcast } from "@/core/linkers";
import { ListSoloBroadcastFragment, StreamKind } from "@/lovekit/api/graphql";
import { Radio } from "lucide-react";
import { StreamerApp, StreamerName, StreamKindIcon } from "../streamer";

interface Props {
  item: ListSoloBroadcastFragment;
  className?: string;
}

/** A broadcast: who sends it, what it carries, since when and from which app. */
const TheCard = ({ item, className }: Props) => {
  const video = item.videoStreams.length;
  const audio = item.audioStreams.length;

  return (
    <LovekitSoloBroadcast.Smart object={item}>
      <Card className={cn("flex h-full flex-col gap-1.5 p-3", className)}>
        <div className="flex items-center gap-2">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-rose-500/10 text-rose-500">
            <Radio className="size-3.5" aria-hidden />
          </span>
          <div className="flex min-w-0 flex-1 flex-col">
            <LovekitSoloBroadcast.DetailLink
              object={item}
              className="truncate text-sm font-medium leading-tight transition-colors hover:text-primary"
            >
              {item.title || "Broadcast"}
            </LovekitSoloBroadcast.DetailLink>
            <StreamerName streamer={item.streamer} className="text-xs text-muted-foreground" />
          </div>
          {(video > 0 || audio > 0) && (
            <span className="flex shrink-0 items-center gap-2 self-start text-xs tabular-nums text-muted-foreground">
              {video > 0 && (
                <span className="flex items-center gap-0.5" title={`${video} video stream${video === 1 ? "" : "s"}`}>
                  <StreamKindIcon kind={StreamKind.Video} className="size-3" />
                  {video > 1 && video}
                </span>
              )}
              {audio > 0 && (
                <span className="flex items-center gap-0.5" title={`${audio} audio stream${audio === 1 ? "" : "s"}`}>
                  <StreamKindIcon kind={StreamKind.Audio} className="size-3" />
                  {audio > 1 && audio}
                </span>
              )}
            </span>
          )}
        </div>

        <div className="mt-auto flex items-center justify-between gap-2 pt-1 text-xs text-muted-foreground/60">
          <span className="shrink-0 whitespace-nowrap">
            <Timestamp date={item.createdAt} relative />
          </span>
          <StreamerApp streamer={item.streamer} className="justify-end" />
        </div>
      </Card>
    </LovekitSoloBroadcast.Smart>
  );
};

export default React.memo(TheCard);
