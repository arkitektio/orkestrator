import React from "react";
import { AppWindow } from "lucide-react";
import { CARD_FRAME_SIZE, CardFrame } from "@/core/ui/card-frame";
import { LokApp } from "@/core/linkers";
import { ListAppFragment } from "../../api/graphql";
import { CardLogo } from "./CardLogo";

interface Props {
  item: ListAppFragment;
}

/** An app registered with the organization: its identifier, under its logo. */
const TheCard = ({ item }: Props) => (
  <LokApp.Smart object={item} menuButton="top" className={`${CARD_FRAME_SIZE} [container-type:normal]!`}>
    <CardFrame
      tone="brand"
      leading={<CardLogo url={item.logo?.presignedUrl} icon={AppWindow} className="h-4 w-4 shrink-0 rounded" />}
      watermark={<CardLogo url={item.logo?.presignedUrl} icon={AppWindow} />}
      title={
        <LokApp.DetailLink object={item} className="min-w-0 truncate font-mono hover:underline">
          {item.identifier}
        </LokApp.DetailLink>
      }
      facts={[]}
      menu
    />
  </LokApp.Smart>
);

export default React.memo(TheCard);
