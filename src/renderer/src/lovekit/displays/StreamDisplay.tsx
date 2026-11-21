import { DisplayLine, DisplayLinePlaceholder } from "@/core/smart/display/DisplayLine";
import { showsCard, type DisplayWidgetProps } from "@/core/smart/display/registry";
import { cn } from "@/core/util/utils";
import { useGetStreamQuery } from "@/lovekit/api/graphql";
import { Loader2, Video } from "lucide-react";
import { AgentApp, LiveDot, streamKindIcon, streamKindLabel } from "../components/agent";
import { StreamView } from "../components/StreamView";

/**
 * `@lovekit/stream`: the live picture where there is room for it ("card"),
 * a line naming it and the app it comes from everywhere else.
 */
export const StreamDisplay = (props: DisplayWidgetProps) => {
  const { data } = useGetStreamQuery({ variables: { id: props.id }, pollInterval: 15_000 });
  const stream = data?.stream;

  if (!showsCard(props.variant) || props.context === "command") {
    if (!stream) return <DisplayLinePlaceholder {...props} icon={Video} />;
    return (
      <DisplayLine
        {...props}
        icon={streamKindIcon(stream.kind)}
        leading={<LiveDot live={stream.live} />}
        title={stream.title}
        meta={[streamKindLabel(stream.kind), <AgentApp agent={stream.agent} />]}
      />
    );
  }

  if (!stream) {
    return (
      <div className={cn("dark flex aspect-video w-full items-center justify-center bg-background text-foreground/60", props.className)}>
        <Loader2 className="size-5 animate-spin" />
      </div>
    );
  }
  return (
    <div className={cn("dark relative aspect-video w-full overflow-hidden rounded-lg bg-background text-foreground", props.className)}>
      <StreamView stream={stream} />
      <div className="absolute left-2 top-2 flex items-center gap-1.5 rounded-md bg-background/60 px-1.5 py-0.5 text-xs text-foreground backdrop-blur">
        <LiveDot live={stream.live} />
        <span className="truncate">{stream.title}</span>
      </div>
    </div>
  );
};
