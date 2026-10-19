import { DisplayLine, DisplayLinePlaceholder } from "@/core/smart/display/DisplayLine";
import { DisplayWidgetProps } from "@/core/smart/display/registry";
import { cn } from "@/core/util/utils";
import { useGetSoloBroadcastQuery } from "@/lovekit/api/graphql";
import { Loader2, Radio } from "lucide-react";
import { StreamerName } from "../components/streamer";
import { StreamJoiner } from "../components/StreamJoiner";

/**
 * `@lovekit/solo_broadcast`: the live video where there is room for it
 * ("card"), a line naming it and its streamer everywhere else.
 */
export const SoloBroadcastDisplay = (props: DisplayWidgetProps) => {
  const { data } = useGetSoloBroadcastQuery({ variables: { id: props.id } });
  const broadcast = data?.soloBroadcast;

  if ((props.variant && props.variant !== "card") || props.context === "command") {
    if (!broadcast) return <DisplayLinePlaceholder {...props} icon={Radio} />;
    return (
      <DisplayLine
        {...props}
        icon={Radio}
        title={broadcast.title || "Broadcast"}
        meta={[<StreamerName streamer={broadcast.streamer} />]}
      />
    );
  }

  if (!broadcast) {
    return (
      <div className={cn("flex h-full w-full items-center justify-center bg-black text-white/60", props.className)}>
        <Loader2 className="size-5 animate-spin" />
      </div>
    );
  }
  return <StreamJoiner broadcast={broadcast} showTitle className={props.className} />;
};
