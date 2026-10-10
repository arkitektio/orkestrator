import { Badge } from "@/core/ui/badge";
import { Card } from "@/core/ui/card";
import { cn } from "@/core/util/utils";
import { BankProvider } from "@/bank/linkers";
import React from "react";
import { ListBankProviderFragment } from "../../api/graphql";
import { providerIcon } from "../providerKind";

const ProviderCard = ({ item }: { item: ListBankProviderFragment }) => {
  const Icon = providerIcon(item.kind);
  return (
    <BankProvider.Smart object={item}>
      <Card className={cn("group p-3 flex flex-col gap-2", !item.enabled && "opacity-60")}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
            <BankProvider.DetailLink object={item} className="truncate font-medium">
              {item.name}
            </BankProvider.DetailLink>
          </div>
          {!item.enabled && (
            <Badge variant="secondary" className="rounded-full px-2 py-0.5 text-[10px]">
              disabled
            </Badge>
          )}
        </div>
        <div className="text-xs text-muted-foreground">
          {item.kindInfo.label}
          {item.dailySyncLimit != null && <> · {item.dailySyncLimit} syncs a day</>}
        </div>
      </Card>
    </BankProvider.Smart>
  );
};

export default React.memo(ProviderCard);
