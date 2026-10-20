import { DisplayLine, DisplayLinePlaceholder } from "@/core/smart/display/DisplayLine";
import type { DisplayWidgetProps } from "@/core/smart/display/registry";
import { useGetAgentQuery } from "@/lovekit/api/graphql";
import { Radio } from "lucide-react";
import { AgentStreams } from "../components/AgentStreams";
import { AgentUser, LiveDot } from "../components/agent";

/**
 * `@lovekit/agent`: every stream of the app, live, where there is room
 * ("card"); a line naming it and how many streams it offers elsewhere.
 */
export const AgentDisplay = (props: DisplayWidgetProps) => {
  const { data } = useGetAgentQuery({ variables: { id: props.id }, pollInterval: 15_000 });
  const agent = data?.agent;

  if ((props.variant && props.variant !== "card") || props.context === "command") {
    if (!agent) return <DisplayLinePlaceholder {...props} icon={Radio} />;
    return (
      <DisplayLine
        {...props}
        icon={Radio}
        leading={<LiveDot live={agent.live} />}
        title={agent.name}
        meta={[`${agent.streams.length} streams`, <AgentUser agent={agent} />]}
      />
    );
  }
  if (!agent) return <DisplayLinePlaceholder {...props} icon={Radio} />;
  return <AgentStreams streams={agent.streams} className={props.className} />;
};
