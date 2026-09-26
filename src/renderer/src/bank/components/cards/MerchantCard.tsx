import { Card } from "@/core/ui/card";
import { BankMerchant } from "@/bank/linkers";
import { Globe } from "lucide-react";
import React from "react";
import { ListMerchantFragment } from "../../api/graphql";
import { CategoryBadge } from "../CategoryBadge";
import { MerchantLogo } from "../MerchantLogo";
import { Money } from "../Money";

/** A merchant: who, how often, and the net spent there per currency. */
const MerchantCard = ({ item }: { item: ListMerchantFragment }) => (
  <BankMerchant.Smart object={item}>
    <Card className="group p-3 flex items-center gap-3">
      <MerchantLogo merchant={item} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <BankMerchant.DetailLink object={item} className="truncate font-medium">
            {item.name}
          </BankMerchant.DetailLink>
          {item.net.map((total) => (
            <Money key={total.currency} amount={total.amount} currency={total.currency} signed className="shrink-0 text-sm" />
          ))}
        </div>
        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span className="flex min-w-0 items-center gap-1.5">
            {item.online && <Globe className="h-3 w-3 shrink-0" aria-label="Online" />}
            <span className="truncate">
              {item.transactionCount} {item.transactionCount === 1 ? "transaction" : "transactions"}
            </span>
          </span>
          {item.category && <CategoryBadge category={item.category} className="shrink-0" link={false} />}
        </div>
      </div>
    </Card>
  </BankMerchant.Smart>
);

export default React.memo(MerchantCard);
