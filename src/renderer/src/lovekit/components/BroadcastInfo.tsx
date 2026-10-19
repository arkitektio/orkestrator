import { LovekitStream } from "@/core/linkers";
import { InfoList } from "@/core/ui/info-list";
import Timestamp from "@/core/ui/timestamp";
import { SoloBroadcastFragment } from "../api/graphql";
import { StreamerApp, StreamerName, StreamKindIcon, streamKindLabel } from "./streamer";

/** A broadcast's Info tab: who sends it, from where, since when, and its streams. */
export const BroadcastInfo = ({ broadcast }: { broadcast: SoloBroadcastFragment }) => {
  const streams = [...broadcast.videoStreams, ...broadcast.audioStreams];
  return (
    <div className="flex flex-col">
      <InfoList
        rows={[
          ["Streamer", <StreamerName streamer={broadcast.streamer} />],
          ["App", <StreamerApp streamer={broadcast.streamer} />],
          ["Started", <Timestamp date={broadcast.createdAt} relative />],
        ]}
      />
      {streams.length > 0 && (
        <div className="flex flex-col gap-1 px-3 pb-3">
          <div className="pb-1 text-xs font-medium text-muted-foreground">Streams</div>
          {streams.map((stream) => (
            <LovekitStream.DetailLink
              key={stream.id}
              object={stream}
              className="flex items-center gap-2 rounded-md px-1.5 py-1 text-sm transition-colors hover:bg-muted/60"
            >
              <StreamKindIcon kind={stream.kind} className="text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate">{stream.title || `${streamKindLabel(stream.kind)} stream`}</span>
              <span className="text-xs text-muted-foreground">{streamKindLabel(stream.kind)}</span>
            </LovekitStream.DetailLink>
          ))}
        </div>
      )}
    </div>
  );
};
