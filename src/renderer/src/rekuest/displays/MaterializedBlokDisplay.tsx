import { DisplayLine, DisplayLinePlaceholder } from "@/core/smart/display/DisplayLine";
import type { DisplayWidgetProps } from "@/core/smart/display/registry";
import { LayoutDashboard } from "lucide-react";
import { useMaterializedBlokQuery } from "../api/graphql";

/** `@rekuest/materialized_blok` elsewhere: its blok and how many of its agents are online. */
export const MaterializedBlokDisplay = (props: DisplayWidgetProps) => {
  const { data } = useMaterializedBlokQuery({ variables: { id: props.id } });
  const materialized = data?.materializedBlok;
  if (!materialized) return <DisplayLinePlaceholder {...props} icon={LayoutDashboard} />;

  const agents = materialized.agentMappings;
  const online = agents.filter((mapping) => mapping.agent.connected).length;
  return (
    <DisplayLine
      {...props}
      icon={LayoutDashboard}
      title={materialized.name || materialized.blok.name}
      meta={[materialized.blok.name, agents.length > 0 && `${online}/${agents.length} agents online`]}
    />
  );
};
