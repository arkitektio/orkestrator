import React from "react";
import { Pin } from "lucide-react";
import { CARD_FRAME_SIZE, CardFrame } from "@/core/ui/card-frame";
import { Name } from "@/core/ui/name";
import { RekuestBlok } from "@/core/linkers";

import { ListBlokFragment } from "@/rekuest/api/graphql";
import { BLOK_CONTEXTS } from "@/rekuest/components/blokContexts";
import { BlokScreen } from "./BlokScreen";

interface Props {
  item: ListBlokFragment;
}

/**
 * A blok in the shared card frame, in the interface tone: its kind's glyph
 * and its name, what kind it is and whose (the app that provides it), and
 * what it looks like as a small screen in the card's body.
 */
const TheCard = ({ item }: Props) => {
  const context = BLOK_CONTEXTS[item.context];
  return (
    <RekuestBlok.Smart object={item} menuButton="top" className={`${CARD_FRAME_SIZE} [container-type:normal]!`}>
      <CardFrame
        tone="interface"
        icon={context?.icon}
        iconLabel={context?.label}
        title={
          <RekuestBlok.DetailLink object={item} className="block min-w-0 hover:underline" title={item.description ?? undefined}>
            <Name>{item.name}</Name>
          </RekuestBlok.DetailLink>
        }
        badge={item.pinned ? <Pin className="h-3 w-3 text-muted-foreground" aria-label="You pinned it" /> : undefined}
        facts={[context?.label, item.app && <span title="Provided by this app's agents">{item.app.identifier}</span>].filter(Boolean)}
        menu
      >
        <BlokScreen blok={item} />
      </CardFrame>
    </RekuestBlok.Smart>
  );
};

export default React.memo(TheCard);
