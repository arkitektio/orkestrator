import React from "react";
import { Boxes, Tag, UserCheck, UserX } from "lucide-react";
import { CARD_FRAME_SIZE, CardFrame, type CardFact } from "@/core/ui/card-frame";
import { LokServiceInstance } from "@/core/linkers";
import { ListServiceInstanceFragment } from "../../api/graphql";

interface Props {
  item: ListServiceInstanceFragment;
}

/** A deployed service: which service and version, and who it lets in or keeps out. */
const TheCard = ({ item }: Props) => {
  const { service, version } = item.release;
  const facts: CardFact[] = [
    { icon: Tag, content: `v${version}`, title: "Version" },
    ...(item.allowedUsers.length
      ? [{ icon: UserCheck, content: `${item.allowedUsers.length} allowed`, title: item.allowedUsers.map((u) => u.username).join(", ") }]
      : []),
    ...(item.deniedUsers.length
      ? [{ icon: UserX, content: `${item.deniedUsers.length} denied`, title: item.deniedUsers.map((u) => u.username).join(", ") }]
      : []),
  ];
  return (
    <LokServiceInstance.Smart object={item} menuButton="top" className={`${CARD_FRAME_SIZE} [container-type:normal]!`}>
      <CardFrame
        tone="brand"
        icon={Boxes}
        watermark={<Boxes strokeWidth={1.25} />}
        title={
          <LokServiceInstance.DetailLink object={item} className="min-w-0 truncate hover:underline">
            {service.name || service.identifier}
          </LokServiceInstance.DetailLink>
        }
        facts={facts}
        stacked
        menu
      />
    </LokServiceInstance.Smart>
  );
};

export default React.memo(TheCard);
