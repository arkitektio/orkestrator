import React from "react";
import { Pin } from "lucide-react";
import { Link } from "react-router-dom";
import { CARD_FRAME_SIZE, CardFrame, LeadWithBead } from "@/core/ui/card-frame";
import { Name } from "@/core/ui/name";
import { cn } from "@/core/util/utils";
import { RekuestBlok, RekuestMaterializedBlok } from "@/core/linkers";

import { ListMaterializedBlokFragment } from "@/rekuest/api/graphql";
import { BlokScreen } from "./BlokScreen";
import { OwnBlokLogo } from "../logo/OwnBlokLogo";

interface Props {
  item: ListMaterializedBlokFragment;
  /** Where its title leads instead of the materialized blok's own page (an agent's panel page). */
  to?: string;
}

/** How many of its agents can answer, as the bead on its glyph says it. */
export const boundPresence = (agents: readonly { connected: boolean }[]): { online: number; label: string; dot: string } => {
  const online = agents.filter((agent) => agent.connected).length;
  if (agents.length === 0) return { online, label: "Bound to no agent", dot: "bg-muted-foreground/50" };
  if (online === agents.length) return { online, label: agents.length === 1 ? "Its agent is online" : "All its agents are online", dot: "bg-success" };
  if (online === 0) return { online, label: agents.length === 1 ? "Its agent is offline" : "None of its agents is online", dot: "bg-muted-foreground/50" };
  return { online, label: `${online} of ${agents.length} agents online`, dot: "bg-warning" };
};

/**
 * A materialized blok: a blok bound to agents. The same card as its blok's
 * (the interface tone, the small screen), plus what binding adds: whether its
 * agents can answer, as a bead on its glyph, and the blok it is of. One whose
 * agents are all away steps back, as an offline agent's card does.
 */
const MaterializedBlokCard = ({ item, to }: Props) => {
  // One per app, however many of the blok's dependencies it answers.
  const agents = [...new Map(item.agentMappings.map((mapping) => [mapping.agent.id, mapping.agent])).values()];
  const presence = boundPresence(agents);
  // The preview loads its models and images from the agents this blok is bound to.
  const bound = React.useMemo(
    () => new Map(item.agentMappings.map((mapping) => [mapping.key, mapping.agent.id])),
    [item.agentMappings],
  );
  const name = item.name ?? item.blok.name;
  const agentNames = agents.map((agent) => agent.name).join(", ");

  return (
    <RekuestMaterializedBlok.Smart object={item} menuButton="top" className={`${CARD_FRAME_SIZE} [container-type:normal]!`}>
      <CardFrame
        tone="interface"
        quiet={agents.length > 0 && presence.online === 0}
        leading={
          <LeadWithBead label={presence.label} bead={<span className={cn("h-1.5 w-1.5 rounded-full", presence.dot)} />}>
            <OwnBlokLogo blok={item.blok} className="h-4 w-4 text-chart-4" />
          </LeadWithBead>
        }
        title={
          to ? (
            <Link
              to={to}
              className="block min-w-0 hover:underline"
              title={item.description ?? item.blok.description ?? undefined}
            >
              <Name>{name}</Name>
            </Link>
          ) : (
            <RekuestMaterializedBlok.DetailLink
              object={item}
              className="block min-w-0 hover:underline"
              title={item.description ?? item.blok.description ?? undefined}
            >
              <Name>{name}</Name>
            </RekuestMaterializedBlok.DetailLink>
          )
        }
        badge={
          (item.pinned || item.isDefault) && (
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              {item.isDefault && <span title="Its agent's default for this kind">default</span>}
              {item.pinned && <Pin className="h-3 w-3" aria-label="You pinned it" />}
            </span>
          )
        }
        facts={[
          // Named after its blok unless it was given a name of its own.
          name !== item.blok.name && (
            <RekuestBlok.DetailLink object={item.blok} className="hover:underline">
              {item.blok.name}
            </RekuestBlok.DetailLink>
          ),
          agents.length > 0 && (
            <span title={agentNames}>
              {agents.length === 1 ? agents[0].name : `${presence.online}/${agents.length} online`}
            </span>
          ),
        ].filter(Boolean)}
        menu
      >
        <BlokScreen blok={item.blok} agents={bound} />
      </CardFrame>
    </RekuestMaterializedBlok.Smart>
  );
};

export default React.memo(MaterializedBlokCard);
