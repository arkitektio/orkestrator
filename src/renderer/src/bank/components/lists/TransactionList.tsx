import { createList } from "@/core/layout/createList";
import { BankTransaction } from "@/bank/linkers";
import { useListTransactionsQuery } from "../../api/graphql";
import TransactionCard from "../cards/TransactionCard";

const TransactionList = createList({
  useHook: useListTransactionsQuery,
  dataKey: "transactions",
  ItemComponent: TransactionCard,
  title: "Transactions",
  emptyTitle: "No transactions",
  smart: BankTransaction,
  minItemWidth: 360,
});

export default TransactionList;
