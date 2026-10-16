import React from "react";
import { Badge } from "@/core/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/core/ui/card";
import { RekuestBlok } from "@/core/linkers";

import { ListBlokFragment } from "@/rekuest/api/graphql";
import { BLOK_CONTEXTS } from "@/rekuest/components/blokContexts";
import { BlokCardBackdrop } from "@/rekuest/components/preview/RekuestBlokPreview";

interface Props {
  item: ListBlokFragment;
}

const TheCard = ({ item }: Props) => {
  const context = BLOK_CONTEXTS[item.context];
  return (
    <RekuestBlok.Smart object={item}>
      <Card className="relative isolate h-full min-h-48 justify-between">
        <BlokCardBackdrop blok={item} />
        {context && (
          <div className="px-4">
            <Badge variant="secondary" className="gap-1 shadow-sm">
              <context.icon className="h-3 w-3" />
              {context.label}
            </Badge>
          </div>
        )}
        <CardHeader className="gap-1">
          <CardTitle className="text-base">
            <RekuestBlok.DetailLink object={item}>{item.name}</RekuestBlok.DetailLink>
          </CardTitle>
          {item.description && <CardDescription className="line-clamp-2">{item.description}</CardDescription>}
        </CardHeader>
      </Card>
    </RekuestBlok.Smart>
  );
};

export default React.memo(TheCard);
