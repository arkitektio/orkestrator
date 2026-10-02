import { BankTransaction } from "@/bank/linkers";
import { useTransactionsCountQuery } from "../api/graphql";
import ReviewTransactionList from "../components/lists/ReviewTransactionList";
import { useTransactionFilterBar } from "../components/filter/TransactionFilterBar";
import { BANK_HELP } from "../help";

const TransactionsPage = () => {
  const { filters, ordering, actions } = useTransactionFilterBar();
  const { data } = useTransactionsCountQuery({ variables: { filters } });
  const count = data?.transactionsCount;

  return (
    <BankTransaction.ListPage
      help={BANK_HELP.transactions}
      title={count != null ? `Transactions · ${count.toLocaleString()}` : "Transactions"}
      pageActions={actions}
    >
      <div className="p-3">
        <ReviewTransactionList filters={filters} ordering={ordering} defaultLimit={50} title="" />
      </div>
    </BankTransaction.ListPage>
  );
};

export default TransactionsPage;
