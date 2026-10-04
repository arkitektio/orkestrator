import React from "react";
import { HomeCard, HomeCardMeta, HomeCardTitle } from "@/core/ui/home-card";
import { MikroFile } from "@/core/linkers";
import { File } from "lucide-react";
import { ListFileFragment } from "../../api/graphql";

interface Props {
  item: ListFileFragment;
  className?: string;
}

// Source - https://stackoverflow.com/q/10420352
// Posted by Hristo, modified by community. See post 'Timeline' for change history
// Retrieved 2026-04-15, License - CC BY-SA 4.0

function getReadableFileSizeString(fileSizeInBytes) {
  let i = -1;
  const byteUnits = [' kB', ' MB', ' GB', ' TB', 'PB', 'EB', 'ZB', 'YB'];
  do {
    fileSizeInBytes /= 1024;
    i++;
  } while (fileSizeInBytes > 1024);

  return Math.max(fileSizeInBytes, 0.1).toFixed(1) + byteUnits[i];
}

const TheCard = ({ item, className }: Props) => {
  return (
    <MikroFile.Smart object={item} menuButton key={item.id} hover>
      <HomeCard className={className}>
        <HomeCardTitle icon={<File />}>
          <MikroFile.DetailLink object={item}>{item.name}</MikroFile.DetailLink>
        </HomeCardTitle>
        <HomeCardMeta className="tabular-nums">
          {getReadableFileSizeString(item.size)}
        </HomeCardMeta>
      </HomeCard>
    </MikroFile.Smart>
  );
};

export default React.memo(TheCard);