import { DisplayLine, DisplayLinePlaceholder } from "@/core/smart/display/DisplayLine";
import type { DisplayWidgetProps } from "@/core/smart/display/registry";
import { LayoutDashboard } from "lucide-react";
import { useMaterializedBlokQuery } from "../api/graphql";
import { MaterializedBlokEmbed } from "../components/MaterializedBlokEmbed";

/**
 * `@rekuest/materialized_blok` elsewhere: its blok and how many of its agents
 * are online, or, as an `embed` (a chat message an agent attached it to), the
 * blok itself, live, opened on the objects shown with it.
 */
export const MaterializedBlokDisplay = (props: DisplayWidgetProps) => {
  const { data } = useMaterializedBlokQuery({ variables: { id: props.id } });
  const materialized = data?.materializedBlok;
  if (!materialized) return <DisplayLinePlaceholder {...props} icon={LayoutDashboard} />;
  if (props.variant === "embed") return <MaterializedBlokEmbed materialized={materialized} alongside={props.alongside} />;

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
