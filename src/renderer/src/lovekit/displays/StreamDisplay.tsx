import { DisplayLine, DisplayLinePlaceholder } from "@/core/smart/display/DisplayLine";
import type { DisplayWidgetProps } from "@/core/smart/display/registry";
import { cn } from "@/core/util/utils";
import { StreamKind, useGetStreamQuery } from "@/lovekit/api/graphql";
import { Loader2, Mic, Video } from "lucide-react";
import { AgentApp, LiveDot, streamKindLabel } from "../components/agent";
import { StreamVideo } from "../components/StreamVideo";

/**
 * `@lovekit/stream`: the live picture where there is room for it ("card"),
 * a line naming it and the app it comes from everywhere else.
 */
export const StreamDisplay = (props: DisplayWidgetProps) => {
  const { data } = useGetStreamQuery({ variables: { id: props.id }, pollInterval: 15_000 });
  const stream = data?.stream;

  if ((props.variant && props.variant !== "card") || props.context === "command") {
    if (!stream) return <DisplayLinePlaceholder {...props} icon={Video} />;
    return (
      <DisplayLine
        {...props}
        icon={stream.kind === StreamKind.Audio ? Mic : Video}
        leading={<LiveDot live={stream.live} />}
        title={stream.title}
        meta={[streamKindLabel(stream.kind), <AgentApp agent={stream.agent} />]}
      />
    );
  }

  if (!stream) {
    return (
      <div className={cn("flex aspect-video w-full items-center justify-center bg-black text-white/60", props.className)}>
        <Loader2 className="size-5 animate-spin" />
      </div>
    );
  }
  return (
    <div className={cn("relative aspect-video w-full overflow-hidden rounded-lg bg-black", props.className)}>
      <StreamVideo stream={stream} />
      <div className="absolute left-2 top-2 flex items-center gap-1.5 rounded-md bg-black/60 px-1.5 py-0.5 text-xs text-white backdrop-blur">
        <LiveDot live={stream.live} />
        <span className="truncate">{stream.title}</span>
      </div>
    </div>
  );
};
