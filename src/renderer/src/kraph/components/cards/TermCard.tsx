import React from "react";
import { Card } from "@/components/ui/card";
import { ListTermFragment } from "@/kraph/api/graphql";
import { KraphTerm } from "@/linkers";
import { termKindLabel, termTint } from "@/kraph/lib/terms";

interface Props {
  item: ListTermFragment;
}

const TheCard = ({ item }: Props) => {
  return (
    <KraphTerm.Smart object={item}>
      <Card className="px-3 py-3 aspect-square transition-all ease-in-out duration-200 relative overflow-hidden flex flex-col">
        <div
          className="absolute inset-x-0 top-0 h-1"
          style={{ background: termTint(item.color) }}
        />
        <KraphTerm.DetailLink
          className={({ isActive }) =>
            "font-bold text-md cursor-pointer truncate" +
            (isActive ? " text-primary-300" : "")
          }
          object={item}
        >
          {item.key}
        </KraphTerm.DetailLink>
        <div className="text-xs text-muted-foreground mt-1">
          {termKindLabel(item.kind)}
        </div>
        {item.label && item.label !== item.key && (
          <p className="text-sm text-muted-foreground mt-2 line-clamp-3">
            {item.label}
          </p>
        )}
      </Card>
    </KraphTerm.Smart>
  );
};

export default React.memo(TheCard);