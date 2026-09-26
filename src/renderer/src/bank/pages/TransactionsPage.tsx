import { BankTransaction } from "@/bank/linkers";
import { useTransactionsCountQuery } from "../api/graphql";
import TransactionList from "../components/lists/TransactionList";
import { useTransactionFilterBar } from "../components/filter/TransactionFilterBar";

const TransactionsPage = () => {
  const { filters, ordering, actions } = useTransactionFilterBar();
  const { data } = useTransactionsCountQuery({ variables: { filters } });
  const count = data?.transactionsCount;

  return (
    <BankTransaction.ListPage
      title={count != null ? `Transactions · ${count.toLocaleString()}` : "Transactions"}
      pageActions={actions}
    >
      <div className="p-3">
        <TransactionList filters={filters} ordering={ordering} defaultLimit={50} title="" />
      </div>
    </BankTransaction.ListPage>
  );
};

export default TransactionsPage;
