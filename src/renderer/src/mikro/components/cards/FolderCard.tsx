import React from "react";
import { HomeCard, HomeCardMeta, HomeCardTitle } from "@/core/ui/home-card";
import { Folder } from "lucide-react";
import { MikroFolder } from "@/core/linkers";
import { ListFolderFragment } from "../../api/graphql";

interface Props {
  item: ListFolderFragment;
  className?: string;
}

const TheCard = ({ item, className }: Props) => {
  return (
    <MikroFolder.Smart object={item} hover>
      <HomeCard className={className}>
        <HomeCardTitle icon={<Folder />}>
          <MikroFolder.DetailLink object={item}>{item.name}</MikroFolder.DetailLink>
        </HomeCardTitle>
        <HomeCardMeta>Folder</HomeCardMeta>
      </HomeCard>
    </MikroFolder.Smart>
  );
};

export default React.memo(TheCard);