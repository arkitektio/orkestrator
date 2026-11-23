import React from "react";
import { Clock, Handshake, User } from "lucide-react";

import { LokCollaboration } from "@/core/linkers";
import { CARD_FRAME_SIZE, CardFrame, type CardFact } from "@/core/ui/card-frame";
import Timestamp from "@/core/ui/timestamp";
import { CollaborationFragment } from "../../api/graphql";

/** One collaboration of the organization: its name, who made it and when. */
const TheCard = ({ item }: { item: CollaborationFragment }) => {
  const facts: CardFact[] = [
    ...(item.description ? [{ content: item.description, title: "What it is for" }] : []),
    ...(item.createdBy ? [{ icon: User, content: item.createdBy.username, title: "Made by" }] : []),
    { icon: Clock, content: <Timestamp date={item.createdAt} relative />, title: "Made", at: "end" },
  ];

  return (
    <LokCollaboration.Smart object={item} menuButton="top" className={`${CARD_FRAME_SIZE} [container-type:normal]!`}>
      <CardFrame
        tone="brand"
        icon={Handshake}
        watermark={<Handshake strokeWidth={1.25} />}
        title={
          <LokCollaboration.DetailLink object={item} className="min-w-0 truncate hover:underline">
            {item.name}
          </LokCollaboration.DetailLink>
        }
        facts={facts}
        stacked
        menu
      />
    </LokCollaboration.Smart>
  );
};

export default React.memo(TheCard);
