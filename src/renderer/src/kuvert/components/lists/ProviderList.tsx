import { createList } from "@/core/layout/createList";
import { useListMailProvidersQuery } from "../../api/graphql";
import { MailProvider } from "../../linkers";
import ProviderCard from "../cards/ProviderCard";

const ProviderList = createList({
  useHook: useListMailProvidersQuery,
  dataKey: "mailProviders",
  ItemComponent: ProviderCard,
  title: "Providers",
  emptyTitle: "No provider set up",
  smart: MailProvider,
  // Its page says so when there is none, with the way to add one.
  autoHide: false,
  minItemWidth: 260,
});

export default ProviderList;
