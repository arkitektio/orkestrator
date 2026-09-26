import { ListRender } from "@/core/layout/ListRender";
import { SidebarLayout } from "@/core/layout/SidebarLayout";
import { FancyInput } from "@/core/ui/fancy-input";
import { PaneLink, SidePaneGroup, SidePaneNav } from "@/core/ui/sidepane";
import { BankAccount } from "@/bank/linkers";
import { useDebounce } from "@uidotdev/usehooks";
import {
  ArrowLeftRight,
  Home,
  Landmark,
  LineChart,
  ListChecks,
  PiggyBank,
  Repeat,
  Tags,
  Wallet,
} from "lucide-react";
import * as React from "react";
import { useListBankAccountsQuery, useListTransactionsQuery } from "../api/graphql";
import TransactionCard from "../components/cards/TransactionCard";
import { KIND_ICON } from "../components/accountKind";
import { formatIban } from "../format";

export const NavigationPane = () => {
  const { data } = useListBankAccountsQuery({ variables: { pagination: { limit: 20 } } });

  return (
    <SidePaneNav columns={2}>
      <SidePaneGroup title="Explore">
        <PaneLink to="/bank">
          <Home />
          Overview
        </PaneLink>
        <PaneLink to="/bank/accounts">
          <Wallet />
          Accounts
        </PaneLink>
        <PaneLink to="/bank/transactions">
          <ArrowLeftRight />
          Transactions
        </PaneLink>
        <PaneLink to="/bank/portfolio">
          <LineChart />
          Portfolio
        </PaneLink>
        <PaneLink to="/bank/budgets">
          <PiggyBank />
          Budgets
        </PaneLink>
        <PaneLink to="/bank/categories">
          <Tags />
          Categories
        </PaneLink>
        <PaneLink to="/bank/rules">
          <ListChecks />
          Rules
        </PaneLink>
        <PaneLink to="/bank/recurring">
          <Repeat />
          Recurring
        </PaneLink>
        <PaneLink to="/bank/connections">
          <Landmark />
          Connections
        </PaneLink>
      </SidePaneGroup>

      {!!data?.bankAccounts.length && (
        <SidePaneGroup title="Accounts" limit={8}>
          {data.bankAccounts.map((account) => (
            <BankAccount.PaneLink object={account} key={account.id}>
              {React.createElement(KIND_ICON[account.kind] ?? Wallet, { className: "h-3.5 w-3.5 shrink-0" })}
              <span className="truncate">{account.name || formatIban(account.iban) || "Account"}</span>
            </BankAccount.PaneLink>
          ))}
        </SidePaneGroup>
      )}
    </SidePaneNav>
  );
};

/** Searching the rail searches transactions: counterparty, purpose, IBAN. */
const SearchResults = ({ search }: { search: string }) => {
  const { data } = useListTransactionsQuery({
    variables: { filters: { search }, pagination: { limit: 20 } },
  });
  return (
    <ListRender array={data?.transactions}>
      {(item) => <TransactionCard item={item} key={item.id} />}
    </ListRender>
  );
};

const Pane: React.FunctionComponent = () => {
  const [search, setSearch] = React.useState("");
  const debouncedSearch = useDebounce(search, 300);

  return (
    <SidebarLayout
      searchBar={
        <FancyInput
          placeholder="Search transactions..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-grow h-full bg-background text-foreground w-full"
        />
      }
    >
      {debouncedSearch.trim() === "" ? <NavigationPane /> : <SearchResults search={debouncedSearch.trim()} />}
    </SidebarLayout>
  );
};

export default Pane;
