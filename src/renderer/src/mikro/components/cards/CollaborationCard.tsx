import React from "react";
import { HomeCard, HomeCardMeta, HomeCardTitle } from "@/core/ui/home-card";
import { Share2 } from "lucide-react";
import { MikroCollaboration } from "@/core/linkers";
import { ListCollaborationFragment } from "../../api/graphql";

interface Props {
  /** `put`: how many objects were put in by hand, counted by the server. */
  item: ListCollaborationFragment & { put?: number };
  className?: string;
}

const TheCard = ({ item, className }: Props) => {
  const put = item.put;
  return (
    <MikroCollaboration.Smart object={item} menuButton>
      <HomeCard className={className}>
        <HomeCardTitle icon={<Share2 />}>
          <MikroCollaboration.DetailLink object={item}>{item.name}</MikroCollaboration.DetailLink>
        </HomeCardTitle>
        <HomeCardMeta>
          {put === undefined ? "Collaboration" : `${put} object${put === 1 ? "" : "s"}`}
        </HomeCardMeta>
      </HomeCard>
    </MikroCollaboration.Smart>
  );
};

export default React.memo(TheCard);
