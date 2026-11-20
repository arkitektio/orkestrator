import React from "react";
import { Cpu, Plug, Tag, User } from "lucide-react";
import { CARD_FRAME_SIZE, CardFrame, type CardFact } from "@/core/ui/card-frame";
import { LokClient } from "@/core/linkers";
import { ListClientFragment } from "../../api/graphql";
import { clientAppIdentifier } from "@/lok/lib/clientLabels";
import { CardLogo } from "./CardLogo";

interface Props {
  item: ListClientFragment;
}

/**
 * A client (an app signed in somewhere): its app and version, whose it is,
 * and at the foot the device it runs on.
 */
const ClientCard = ({ item }: Props) => {
  const logo = item.logo?.presignedUrl ?? item.release?.logo?.presignedUrl;
  const facts: CardFact[] = [
    ...(item.release ? [{ icon: Tag, content: `v${item.release.version}`, title: "Version" }] : []),
    { icon: User, content: item.user?.username ?? "No user", title: "Signed in as" },
    {
      icon: Cpu,
      title: "Device",
      at: "end",
      content: item.node ? (item.node.name?.trim() || <span className="italic">Unnamed</span>) : <span className="italic">No device</span>,
    },
  ];

  return (
    <LokClient.Smart object={item} menuButton="top" className={`${CARD_FRAME_SIZE} [container-type:normal]!`}>
      <CardFrame
        tone="brand"
        leading={<CardLogo url={logo} icon={Plug} className="h-4 w-4 shrink-0 rounded" />}
        watermark={<CardLogo url={logo} icon={Plug} />}
        title={
          <LokClient.DetailLink object={item} className="min-w-0 truncate hover:underline">
            {clientAppIdentifier(item)}
          </LokClient.DetailLink>
        }
        facts={facts}
        stacked
        menu
      />
    </LokClient.Smart>
  );
};

export default React.memo(ClientCard);
