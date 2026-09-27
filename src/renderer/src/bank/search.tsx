import { useBankPaletteSearchQuery } from "@/bank/api/graphql";
import { CommandGroup } from "cmdk";

import { EntityRow } from "@/core/command/sources/entity/EntityRow";
import { GroupHeading, PER_TYPE_LIMIT } from "@/core/command/sources/entity/shared";
import { formatDay, formatIban, formatMoney } from "./format";

/** Bank's slice: transactions, accounts, merchants, categories. Mounted only
 * inside the bank guard (the host's `moduleGuard`). */
export const BankEntitySearch = ({ term, onDone }: { term: string; onDone?: () => void }) => {
  const { data } = useBankPaletteSearchQuery({
    variables: { search: term, limit: PER_TYPE_LIMIT },
    fetchPolicy: "cache-first",
  });

  const rows = [
    ...(data?.transactions ?? []).map((t) => ({
      identifier: "@bank/transaction",
      id: t.id,
      // The counterparty is what people search by; the remittance line when a
      // transaction has none (card payments, fees).
      label: t.counterparty || t.remittance || "Transaction",
      description: [formatMoney(t.amount, t.currency, { signed: true }), formatDay(t.bookingDate)]
        .filter(Boolean)
        .join(" · "),
    })),
    ...(data?.bankAccounts ?? []).map((a) => ({
      identifier: "@bank/account",
      id: a.id,
      label: a.name || formatIban(a.iban) || "Account",
      description: a.iban ? formatIban(a.iban) : a.currency,
    })),
    ...(data?.merchants ?? []).map((m) => ({
      identifier: "@bank/merchant",
      id: m.id,
      label: m.name,
      description: m.description || undefined,
    })),
    ...(data?.categories ?? []).map((c) => ({
      identifier: "@bank/category",
      id: c.id,
      label: c.name,
      description: c.description || undefined,
    })),
  ];

  if (rows.length === 0) return null;

  return (
    <CommandGroup heading={<GroupHeading>Finances</GroupHeading>}>
      {rows.map((row) => (
        <EntityRow key={`${row.identifier}:${row.id}`} {...row} onDone={onDone} />
      ))}
    </CommandGroup>
  );
};

export default BankEntitySearch;
