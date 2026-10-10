import { createList } from "@/core/layout/createList";
import { BankProvider } from "@/bank/linkers";
import { useListBankProvidersQuery } from "../../api/graphql";
import ProviderCard from "../cards/ProviderCard";

const ProviderList = createList({
  useHook: useListBankProvidersQuery,
  dataKey: "bankProviders",
  ItemComponent: ProviderCard,
  title: "Providers",
  emptyTitle: "No provider set up",
  smart: BankProvider,
  minItemWidth: 240,
});

export default ProviderList;
