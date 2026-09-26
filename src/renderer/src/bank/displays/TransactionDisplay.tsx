import { DisplayWidgetProps } from "@/core/smart/display/registry";
import { BankTransaction } from "@/bank/linkers";
import { useGetTransactionQuery } from "../api/graphql";
import TransactionCard from "../components/cards/TransactionCard";
import { Money } from "../components/Money";

/** `@bank/transaction` wherever another module shows one (a receipt, a note). */
export const TransactionDisplay = (props: DisplayWidgetProps) => {
  const { data } = useGetTransactionQuery({ variables: { id: props.id } });
  const tx = data?.transaction;
  if (!tx) return <span className="text-xs text-muted-foreground">Transaction</span>;

  if (props.variant === "inline" || props.variant === "avatar" || props.variant === "chip") {
    return (
      <BankTransaction.DetailLink object={tx} className="inline-flex items-center gap-2">
        <span className="truncate">{tx.counterparty || tx.remittance || "Transaction"}</span>
        <Money amount={tx.amount} currency={tx.currency} signed className="text-xs" />
      </BankTransaction.DetailLink>
    );
  }
  return <TransactionCard item={tx} />;
};
