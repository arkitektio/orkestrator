import { createList } from "@/core/layout/createList";
import { BankTransaction } from "@/bank/linkers";
import { ListTransactionsQueryVariables, useListTransactionsQuery } from "../../api/graphql";
import TransactionCard from "../cards/TransactionCard";

/**
 * A transaction list whose rows carry their category suggestions, so lines
 * without a settled category can be categorized with one click.
 */
const ReviewTransactionList = createList({
  useHook: (options: { variables: ListTransactionsQueryVariables; fetchPolicy?: any }) =>
    useListTransactionsQuery({ ...options, variables: { ...options.variables, withSuggestions: true } }),
  dataKey: "transactions",
  ItemComponent: TransactionCard,
  title: "Transactions",
  emptyTitle: "No transactions",
  smart: BankTransaction,
  minItemWidth: 360,
});

export default ReviewTransactionList;
