import React from "react";
import { Hash, Server } from "lucide-react";
import { CARD_FRAME_SIZE, CardFrame, type CardFact } from "@/core/ui/card-frame";
import { LokService } from "@/core/linkers";
import { ListServiceFragment } from "../../api/graphql";
import { CardLogo } from "./CardLogo";

interface Props {
  item: ListServiceFragment;
}

/** A kind of service: its name and what it does, its identifier at the foot. */
const TheCard = ({ item }: Props) => {
  const facts: CardFact[] = [
    { icon: Hash, content: <span className="font-mono">{item.identifier}</span>, title: String(item.identifier), at: "end" },
  ];
  return (
    <LokService.Smart object={item} menuButton="top" className={`${CARD_FRAME_SIZE} [container-type:normal]!`}>
      <CardFrame
        tone="brand"
        leading={<CardLogo url={item.logo?.presignedUrl} icon={Server} className="h-4 w-4 shrink-0 rounded" />}
        watermark={<CardLogo url={item.logo?.presignedUrl} icon={Server} />}
        title={
          <LokService.DetailLink object={item} className="min-w-0 truncate hover:underline">
            {item.name}
          </LokService.DetailLink>
        }
        facts={facts}
        stacked
        menu
      >
        {item.description && (
          <p className="line-clamp-3 px-1 text-xs text-muted-foreground" title={item.description}>
            {item.description}
          </p>
        )}
      </CardFrame>
    </LokService.Smart>
  );
};

export default React.memo(TheCard);
