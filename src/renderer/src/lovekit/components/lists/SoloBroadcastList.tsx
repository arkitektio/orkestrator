import { createList } from "@/core/layout/createList";
import { LovekitSoloBroadcast } from "@/core/linkers";
import type { WatchQueryFetchPolicy } from "@apollo/client";
import type { OffsetPaginationInput } from "@/core/layout/pagination";
import { SoloBroadcastFilter, useListSoloBroadcastsQuery } from "@/lovekit/api/graphql";
import SoloBroadcastCard from "../cards/SoloBroadcastCard";

// The backend names this argument `filter`; the list factory speaks `filters`.
const useItems = ({ variables, fetchPolicy }: { variables: { filters?: SoloBroadcastFilter; pagination: OffsetPaginationInput }; fetchPolicy?: WatchQueryFetchPolicy }) =>
  useListSoloBroadcastsQuery({ variables: { filter: variables.filters, pagination: variables.pagination }, fetchPolicy });

const TList = createList({
  useHook: useItems,
  dataKey: "soloBroadcasts",
  ItemComponent: SoloBroadcastCard,
  title: "Solo Broadcasts",
  smart: LovekitSoloBroadcast,
  // A page of its own says so when there is nothing, instead of going blank.
  autoHide: false,
  // Title, streamer and app need the room; the default pack squeezes them.
  minItemWidth: 240,
  emptyTitle: "No broadcasts yet",
});

export default TList;
