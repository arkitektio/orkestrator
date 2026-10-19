import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import { Sidebars } from "@/core/layout/Sidebars";
import { LovekitStream } from "@/core/linkers";
import { InfoList } from "@/core/ui/info-list";
import { cn } from "@/core/util/utils";
import { StreamKind, useGetStreamQuery } from "../api/graphql";
import { StreamerApp, StreamerName, StreamKindIcon, streamKindLabel } from "../components/streamer";
import { LOVEKIT_HELP } from "../help";

export default asDetailQueryRoute(
  useGetStreamQuery,
  ({ data }) => {
    const stream = data.stream;
    const audio = stream.kind === StreamKind.Audio;
    const title = stream.title || `${streamKindLabel(stream.kind)} stream`;
    return (
      <LovekitStream.ModelPage
        help={LOVEKIT_HELP.stream}
        title={title}
        object={stream}
        pageActions={
          <>
            <LovekitStream.ObjectButton alwaysShow object={stream} />
          </>
        }
        sidebars={
          <Sidebars>
            <Sidebars.Tab label="Knowledge">
              <LovekitStream.Knowledge object={stream} />
            </Sidebars.Tab>
          </Sidebars>
        }
      >
        <div className="flex max-w-xl flex-col gap-4 p-6">
          <div className="flex items-center gap-3">
            <span
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-lg",
                audio ? "bg-amber-500/10 text-amber-500" : "bg-sky-500/10 text-sky-500",
              )}
            >
              <StreamKindIcon kind={stream.kind} className="size-5" />
            </span>
            <div className="min-w-0">
              <div className="truncate text-lg font-semibold leading-tight">{title}</div>
              <div className="text-sm text-muted-foreground">{streamKindLabel(stream.kind)} stream</div>
            </div>
          </div>
          <InfoList
            rows={[
              ["Streamer", <StreamerName streamer={stream.streamer} />],
              ["App", <StreamerApp streamer={stream.streamer} />],
            ]}
          />
        </div>
      </LovekitStream.ModelPage>
    );
  },
);
