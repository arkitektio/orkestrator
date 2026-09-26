import { Card } from "@/core/ui/card";
import { BankCategory } from "@/bank/linkers";
import React from "react";
import { ListCategoryFragment } from "../../api/graphql";

const CategoryCard = ({ item }: { item: ListCategoryFragment }) => (
  <BankCategory.Smart object={item}>
    <Card className="group p-3 flex items-center gap-2">
      <span
        className="h-3 w-3 shrink-0 rounded-full bg-muted-foreground"
        style={item.color ? { backgroundColor: item.color } : undefined}
      />
      <div className="min-w-0">
        <BankCategory.DetailLink object={item} className="block truncate font-medium">
          {item.name}
        </BankCategory.DetailLink>
        <div className="truncate text-xs text-muted-foreground">
          {item.kind.toLowerCase()}
          {item.parent && <> · in {item.parent.name}</>}
        </div>
      </div>
    </Card>
  </BankCategory.Smart>
);

export default React.memo(CategoryCard);
