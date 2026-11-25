import React from "react";
import { MikroFixture } from "@/core/linkers";
import { Card } from "@/core/ui/card";
import Timestamp from "@/core/ui/timestamp";
import type { ListFixtureFragment } from "@/mikro/api/graphql";

const TheCard = ({ item }: { item: ListFixtureFragment }) => (
  <MikroFixture.Smart object={item} menuButton>
    <Card className="flex h-full flex-col gap-1.5 p-3">
      <MikroFixture.DetailLink object={item} className="truncate text-sm font-medium hover:underline">
        {item.label}
      </MikroFixture.DetailLink>
      <div className="truncate text-xs text-muted-foreground">
        <Timestamp date={item.createdAt} relative />
      </div>
    </Card>
  </MikroFixture.Smart>
);

export default React.memo(TheCard);
