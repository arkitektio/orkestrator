import { createList } from "@/core/layout/createList";
import { CARD_FRAME_MIN_WIDTH } from "@/core/ui/card-frame";
import { LokClient } from "@/core/linkers";
import { useClientsQuery } from "@/lok/api/graphql";
import ClientCard from "../cards/ClientCard";

const ClientList = createList({
  useHook: useClientsQuery,
  dataKey: "clients",
  ItemComponent: ClientCard,
  title: "Clients",
  smart: LokClient,
  // A page of its own says so when there is nothing, instead of going blank.
  autoHide: false,
  emptyTitle: "No clients yet",
  emptyDescription: "A client appears once an app signs in to your organization.",
  minItemWidth: CARD_FRAME_MIN_WIDTH,
  defaultLimit: 40,
});

export default ClientList;
