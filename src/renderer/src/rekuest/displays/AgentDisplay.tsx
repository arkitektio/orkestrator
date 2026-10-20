import { DisplayLine, DisplayLinePlaceholder } from "@/core/smart/display/DisplayLine";
import type { DisplayWidgetProps } from "@/core/smart/display/registry";
import { cn } from "@/core/util/utils";
import { useHoverAgentQuery } from "../api/graphql";
import { AgentLogo } from "../components/logo/BlokLogo";

/** `@rekuest/agent` elsewhere: a presence dot, its name, app and version. */
export const AgentDisplay = (props: DisplayWidgetProps) => {
  const { data } = useHoverAgentQuery({ variables: { id: props.id } });
  const agent = data?.agent;
  if (!agent) return <DisplayLinePlaceholder {...props} />;

  return (
    <DisplayLine
      {...props}
      leading={
        <span className="relative mx-0.5 inline-flex shrink-0 items-center">
          <AgentLogo agent={agent} className="h-4 w-4" />
          <span
            aria-label={agent.connected ? "Connected" : "Offline"}
            className={cn(
              "h-2 w-2 rounded-full",
              // Over the logo's corner when there is one, where the dot alone was before.
              agent.logo?.blok && "absolute -bottom-0.5 -right-0.5 ring-1 ring-background",
              agent.blocked ? "bg-red-500" : agent.connected ? "bg-green-500" : "bg-muted-foreground/40",
            )}
          />
        </span>
      }
      title={agent.name}
      meta={[
        agent.blocked ? "blocked" : agent.connected ? "online" : "offline",
        agent.app?.identifier,
        agent.release?.version,
        agent.supervisor ? `supervised by ${agent.supervisor}` : undefined,
      ]}
    />
  );
};
