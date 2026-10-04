import { createList } from "@/core/layout/createList";
import { LovekitStream } from "@/core/linkers";
import type { WatchQueryFetchPolicy } from "@apollo/client";
import type { OffsetPaginationInput } from "@/core/layout/pagination";
import { StreamFilter, useListStreamsQuery } from "@/lovekit/api/graphql";
import StreamCard from "../StreamCard";

// The backend names this argument `filter`; the list factory speaks `filters`.
const useItems = ({ variables, fetchPolicy }: { variables: { filters?: StreamFilter; pagination: OffsetPaginationInput }; fetchPolicy?: WatchQueryFetchPolicy }) =>
  useListStreamsQuery({ variables: { filter: variables.filters, pagination: variables.pagination }, fetchPolicy });

const TList = createList({
  useHook: useItems,
  dataKey: "streams",
  ItemComponent: StreamCard,
  title: "Streams",
  smart: LovekitStream,
  // A page of its own says so when there is nothing, instead of going blank.
  autoHide: false,
  emptyTitle: "No streams yet",
});

export default TList;
