import { cn } from "@/core/util/utils";
import { LovekitStream } from "@/core/linkers";
import { ListStreamFragment } from "../api/graphql";
import { LiveDot } from "./agent";
import { StreamVideo } from "./StreamVideo";

/** An agent's streams side by side, each live, each linking to its page. */
export const AgentStreams = ({ streams, className }: { streams: ListStreamFragment[]; className?: string }) => {
  if (streams.length === 0) {
    return <div className={cn("p-4 text-sm text-muted-foreground", className)}>This app offers no streams.</div>;
  }
  return (
    <div className={cn("grid gap-3 sm:grid-cols-2", className)}>
      {streams.map((stream) => (
        <div key={stream.id} className="flex flex-col gap-1.5">
          <div className="aspect-video overflow-hidden rounded-lg bg-black">
            <StreamVideo stream={stream} />
          </div>
          <div className="flex items-center gap-1.5 text-sm">
            <LiveDot live={stream.live} />
            <LovekitStream.DetailLink object={stream} className="truncate font-medium hover:text-primary">
              {stream.title}
            </LovekitStream.DetailLink>
          </div>
        </div>
      ))}
    </div>
  );
};
