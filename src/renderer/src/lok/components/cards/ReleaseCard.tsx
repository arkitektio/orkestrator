import React from "react";
import { AppWindow, Tag } from "lucide-react";
import { CARD_FRAME_SIZE, CardFrame, type CardFact } from "@/core/ui/card-frame";
import { LokRelease } from "@/core/linkers";
import { ListReleaseFragment } from "../../api/graphql";
import { CardLogo } from "./CardLogo";

interface Props {
  item: ListReleaseFragment;
}

/** One version of an app: the version, and the app it belongs to. */
const TheCard = ({ item }: Props) => {
  const logo = item.logo?.presignedUrl ?? item.app.logo?.presignedUrl;
  const facts: CardFact[] = [
    { icon: AppWindow, content: <span className="font-mono">{item.app.identifier}</span>, title: String(item.app.identifier) },
  ];
  return (
    <LokRelease.Smart object={item} menuButton="top" className={`${CARD_FRAME_SIZE} [container-type:normal]!`}>
      <CardFrame
        tone="brand"
        leading={<CardLogo url={logo} icon={Tag} className="h-4 w-4 shrink-0 rounded" />}
        watermark={<CardLogo url={logo} icon={Tag} />}
        title={
          <LokRelease.DetailLink object={item} className="min-w-0 truncate font-mono hover:underline">
            v{item.version}
          </LokRelease.DetailLink>
        }
        facts={facts}
        stacked
        menu
      />
    </LokRelease.Smart>
  );
};

export default React.memo(TheCard);
