import React from "react";
import { HomeCard, HomeCardMeta, HomeCardTitle } from "@/core/ui/home-card";
import { Share2 } from "lucide-react";
import { MikroCollaboration } from "@/core/linkers";
import { ListCollaborationFragment } from "../../api/graphql";

interface Props {
  item: ListCollaborationFragment & { items?: { brought: boolean }[] };
  className?: string;
}

const TheCard = ({ item, className }: Props) => {
  const put = item.items?.filter((entry) => !entry.brought).length;
  return (
    <MikroCollaboration.Smart object={item} menuButton hover>
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
