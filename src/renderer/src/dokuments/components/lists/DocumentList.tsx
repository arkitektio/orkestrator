import { createList } from "@/core/layout/createList";
import { DokumentsDocument } from "@/core/linkers";
import type { WatchQueryFetchPolicy } from "@apollo/client";
import type { OffsetPaginationInput } from "@/core/layout/pagination";
import { DocumentFilter, useListDocumentsQuery } from "@/dokuments/api/graphql";
import DocumentCard from "../cards/DocumentCard";

// The backend names this argument `filter`; the list factory speaks `filters`.
const useItems = ({ variables, fetchPolicy }: { variables: { filters?: DocumentFilter; pagination: OffsetPaginationInput }; fetchPolicy?: WatchQueryFetchPolicy }) =>
  useListDocumentsQuery({ variables: { filter: variables.filters, pagination: variables.pagination }, fetchPolicy });

const TList = createList({
  useHook: useItems,
  dataKey: "documents",
  ItemComponent: DocumentCard,
  title: "Documents",
  smart: DokumentsDocument,
  // A page of its own says so when there is nothing, instead of going blank.
  autoHide: false,
  emptyTitle: "No documents yet",
});

export default TList;
