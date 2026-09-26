import { createList } from "@/core/layout/createList";
import { BankAccount } from "@/bank/linkers";
import { useListBankAccountsQuery } from "../../api/graphql";
import AccountCard from "../cards/AccountCard";

const AccountList = createList({
  useHook: useListBankAccountsQuery,
  dataKey: "bankAccounts",
  ItemComponent: AccountCard,
  title: "Accounts",
  emptyTitle: "No accounts yet",
  smart: BankAccount,
  minItemWidth: 240,
});

export default AccountList;
