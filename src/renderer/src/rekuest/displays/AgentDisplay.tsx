import { DisplayLine, DisplayLinePlaceholder } from "@/core/smart/display/DisplayLine";
import type { DisplayWidgetProps } from "@/core/smart/display/registry";
import { cn } from "@/core/util/utils";
import { useHoverAgentQuery } from "../api/graphql";

/** `@rekuest/agent` elsewhere: a presence dot, its name, app and version. */
export const AgentDisplay = (props: DisplayWidgetProps) => {
  const { data } = useHoverAgentQuery({ variables: { id: props.id } });
  const agent = data?.agent;
  if (!agent) return <DisplayLinePlaceholder {...props} />;

  return (
    <DisplayLine
      {...props}
      leading={
        <span
          aria-label={agent.connected ? "Connected" : "Offline"}
          className={cn(
            "mx-0.5 h-2 w-2 rounded-full",
            agent.blocked ? "bg-red-500" : agent.connected ? "bg-green-500" : "bg-muted-foreground/40",
          )}
        />
      }
      title={agent.name}
      meta={[
        agent.blocked ? "blocked" : agent.connected ? "online" : "offline",
        agent.app?.identifier,
        agent.release?.version,
      ]}
    />
  );
};
