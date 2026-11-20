import React from "react";
import { Hash, Layers } from "lucide-react";
import { CARD_FRAME_SIZE, CardFrame, type CardFact } from "@/core/ui/card-frame";
import { LokLayer } from "@/core/linkers";
import { ListLayerFragment } from "../../api/graphql";
import { CardLogo } from "./CardLogo";

interface Props {
  item: ListLayerFragment;
}

/** A connection layer: its name and what it is for, its identifier at the foot. */
const TheCard = ({ item }: Props) => {
  const facts: CardFact[] = [
    { icon: Hash, content: <span className="font-mono">{item.identifier}</span>, title: String(item.identifier), at: "end" },
  ];
  return (
    <LokLayer.Smart object={item} menuButton="top" className={`${CARD_FRAME_SIZE} [container-type:normal]!`}>
      <CardFrame
        tone="brand"
        leading={<CardLogo url={item.logo?.presignedUrl} icon={Layers} className="h-4 w-4 shrink-0 rounded" />}
        watermark={<CardLogo url={item.logo?.presignedUrl} icon={Layers} />}
        title={
          <LokLayer.DetailLink object={item} className="min-w-0 truncate hover:underline">
            {item.name}
          </LokLayer.DetailLink>
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
    </LokLayer.Smart>
  );
};

export default React.memo(TheCard);
