import { StructureDisplay } from "@/core/smart/display/StructureDisplay";
import React from "react";
import { Bot, Clock, Cpu, Podcast, Tag } from "lucide-react";
import { CARD_FRAME_SIZE, CardFrame, LeadWithBead, type CardFact } from "@/core/ui/card-frame";
import { identityColor, identityHue } from "@/core/ui/identityColor";
import { Name } from "@/core/ui/name";
import Timestamp from "@/core/ui/timestamp";
import { RekuestAgent } from "@/core/linkers";

import { ListAgentFragment } from "@/rekuest/api/graphql";
import { AgentLogo } from "@/rekuest/components/logo/BlokLogo";
import { agentDescriptors } from "@/rekuest/smart/agent";
import { SupervisorRestartButton } from "../agent/SupervisorRestartButton";
import { AgentStatusDot, agentStatus, agentStatusLabel } from "../displays/AgentStatusDot";

interface Props {
  item: ListAgentFragment;
}


/**
 * An agent in the shared card frame, with its logo large and faint behind it.
 * A connected agent wears the theme colour; one that is not is grey and steps
 * back. Its presence (online, recently active, offline, blocked) is the bead
 * on its logo; one fact per line
 * under the name (the version, its own name when it differs from its app's),
 * and at the foot the device it
 * runs on ("Unnamed" when lok knows no name) and when it was last seen. An
 * offline agent steps back.
 */
const TheCard = ({ item }: Props) => {
  // What actions match it by: its supervisor's take only the agents they supervise.
  const object = React.useMemo(() => {
    const descriptors = agentDescriptors(item);
    return descriptors ? { ...item, descriptors } : item;
  }, [item]);
  const status = agentStatus(item);
  const seed = identityHue(item.app.identifier);
  const hasLogo = !!item.logo?.blok;

  const facts: CardFact[] = [
    { icon: Tag, content: `v${item.release.version}`, title: "Version" },
    ...(item.name && item.name !== item.app.identifier ? [{ icon: Bot, content: item.name, title: "Agent" }] : []),
    {
      icon: Cpu,
      title: "Device",
      at: "end",
      content: item.device ? (
        <StructureDisplay
          identifier="@lok/device"
          by="nodeId"
          id={item.device.deviceId}
          variant="inline"
          fallback={<span className="italic">Unnamed</span>}
        />
      ) : (
        <span className="italic">No device</span>
      ),
    },
    ...(status !== "online" && item.lastSeen
      ? [{ icon: Clock, title: "Last seen", at: "end" as const, content: <>seen <Timestamp date={item.lastSeen} relative /></> }]
      : []),
  ];

  return (
    <RekuestAgent.Smart object={object} menuButton="top" className={`${CARD_FRAME_SIZE} [container-type:normal]!`}>
      <CardFrame
        // The theme colour while connected; grey, and stepped back, when not.
        tone="brand"
        status={status === "online" ? undefined : { tone: "idle", label: agentStatusLabel(status) }}
        quiet={status !== "online"}
        watermark={hasLogo ? <AgentLogo agent={item} /> : <Podcast strokeWidth={1.25} />}
        leading={
          // Its presence as a bead on its logo, the same as the band.
          <LeadWithBead label={agentStatusLabel(status)} bead={<AgentStatusDot status={status} className="h-1.5 w-1.5" />}>
            {hasLogo ? (
              <AgentLogo agent={item} className="h-5 w-5" />
            ) : (
              <Podcast className="h-5 w-5" style={{ color: identityColor(seed) }} />
            )}
          </LeadWithBead>
        }
        title={
          <RekuestAgent.DetailLink object={item} className="block min-w-0 hover:underline">
            <Name>{item.app.identifier}</Name>
          </RekuestAgent.DetailLink>
        }
        facts={facts}
        stacked
        // A supervised app restarts from its card, through its supervisor.
        footer={item.supervisor ? <SupervisorRestartButton agent={item} /> : undefined}
        menu
      />
    </RekuestAgent.Smart>
  );
};

export default React.memo(TheCard);
