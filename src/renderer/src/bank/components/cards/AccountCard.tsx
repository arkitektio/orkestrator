import { Card } from "@/core/ui/card";
import { cn } from "@/core/util/utils";
import { BankAccount } from "@/bank/linkers";
import { AlertTriangle, RefreshCw, Wallet } from "lucide-react";
import React from "react";
import { ListBankAccountFragment } from "../../api/graphql";
import { KIND_ICON } from "../accountKind";
import { formatIban } from "../../format";
import { Money } from "../Money";

/** An account: its name, where it lives, and what is on it now. */
const AccountCard = ({ item }: { item: ListBankAccountFragment }) => {
  const balance = item.latestBalance;
  const trouble = item.lastError || item.connection?.needsReauth;
  const Icon = KIND_ICON[item.kind] ?? Wallet;
  return (
    <BankAccount.Smart object={item}>
      <Card className="group p-3 flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-start gap-2">
            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <BankAccount.DetailLink object={item} className="block truncate font-medium">
                {item.name || item.product || formatIban(item.iban) || "Account"}
              </BankAccount.DetailLink>
              <div className="truncate text-xs text-muted-foreground">
                {item.connection?.aspspName}
                {item.iban && <> · {formatIban(item.iban)}</>}
              </div>
            </div>
          </div>
          {item.isSyncing ? (
            <RefreshCw className="h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground" />
          ) : trouble ? (
            <AlertTriangle
              className="h-3.5 w-3.5 shrink-0 text-amber-500"
              aria-label={item.lastError ?? "The bank consent ran out"}
            />
          ) : null}
        </div>
        <div className={cn("text-xl font-semibold", !balance && "text-muted-foreground")}>
          {balance ? <Money amount={balance.amount} currency={balance.currency} /> : "No balance yet"}
        </div>
      </Card>
    </BankAccount.Smart>
  );
};

export default React.memo(AccountCard);
