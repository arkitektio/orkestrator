import React from "react";
import Timestamp from "@/core/ui/timestamp";
import { CARD_FRAME_SIZE, CardFrame, StatusPill, type CardFact, type CardStatus } from "@/core/ui/card-frame";
import { LokMandate } from "@/core/linkers";
import { Clock, Cpu, KeyRound, MonitorPlay, Tag } from "lucide-react";
import { ListMandateFragment } from "../../api/graphql";
import {
  MANDATE_STATUS_LABEL,
  type MandateStatus,
  mandateHolder,
  mandateStatus,
  mandateSubject,
} from "../../lib/mandateLabels";

interface Props {
  item: ListMandateFragment;
}

/** The colour of each state's pill. */
const STATUS_TONE: Record<MandateStatus, CardStatus["tone"]> = {
  live: "good",
  paused: "attention",
  expired: "idle",
  revoked: "idle",
};

/**
 * One app allowed to act as its grantor: what runs (the subject) and its
 * version, who signs it in (an agent app or a key holder) and on which
 * device, how many instances are signed in right now, and its state as a pill
 * at the bottom right. A revoked one steps back.
 */
const TheCard = ({ item }: Props) => {
  const subject = mandateSubject(item);
  const status = mandateStatus(item);
  const device = item.agentDevice ? (item.agentDevice.name ?? item.agentDevice.deviceId) : item.subject.deviceId;
  const facts: CardFact[] = [
    ...(subject.version ? [{ icon: Tag, content: <span className="font-mono">v{subject.version}</span>, title: "Version" }] : []),
    { icon: KeyRound, content: `run by ${mandateHolder(item)}`, title: "Signed in by" },
    ...(device ? [{ icon: Cpu, content: device, title: "Device" }] : []),
    ...(status !== "revoked"
      ? [
          {
            icon: MonitorPlay,
            title: "Instances signed in under this mandate",
            content: `${item.clientCount}${item.maxClients != null ? ` / ${item.maxClients}` : ""} running`,
          },
        ]
      : []),
    { icon: Clock, content: <Timestamp date={item.createdAt} relative />, title: "Granted", at: "end" },
  ];

  return (
    <LokMandate.Smart object={item} menuButton="top" className={`${CARD_FRAME_SIZE} [container-type:normal]!`}>
      <CardFrame
        tone="brand"
        quiet={status === "revoked"}
        icon={KeyRound}
        watermark={<KeyRound strokeWidth={1.25} />}
        title={
          <LokMandate.DetailLink object={item} className="min-w-0 truncate hover:underline">
            {subject.identifier}
          </LokMandate.DetailLink>
        }
        facts={facts}
        stacked
        footer={<StatusPill tone={STATUS_TONE[status]}>{MANDATE_STATUS_LABEL[status]}</StatusPill>}
        menu
      />
    </LokMandate.Smart>
  );
};

export default React.memo(TheCard);
