import { Card } from "@/core/ui/card";
import { cn } from "@/core/util/utils";
import { BankCategory } from "@/bank/linkers";
import { EyeOff } from "lucide-react";
import React from "react";
import { ListCategoryFragment } from "../../api/graphql";

const CategoryCard = ({ item }: { item: ListCategoryFragment }) => (
  <BankCategory.Smart object={item}>
    <Card className={cn("group p-3 flex items-center gap-2", item.hidden && "opacity-60")} title={item.description || undefined}>
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
      {item.hidden && <EyeOff className="ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-label="Hidden" />}
    </Card>
  </BankCategory.Smart>
);

export default React.memo(CategoryCard);
