import { createList } from "@/core/layout/createList";
import { LokClient } from "@/core/linkers";
import { useClientsQuery } from "@/lok/api/graphql";
import ClientCard from "../cards/ClientCard";

const TList = createList({
  useHook: useClientsQuery,
  dataKey: "clients",
  ItemComponent: ClientCard,
  title: "Clients",
  smart: LokClient,
  // A page of its own says so when there is nothing, instead of going blank.
  autoHide: false,
  emptyTitle: "No clients yet",
});

export default TList;
