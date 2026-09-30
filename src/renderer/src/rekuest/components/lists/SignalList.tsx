import { createList } from "@/core/layout/createList";
import { ListSignalsQuery, useListSignalsQuery } from "@/rekuest/api/graphql";
import SignalCard from "../automation/SignalCard";

const SignalList = createList<
  ListSignalsQuery,
  never,
  never,
  never,
  ListSignalsQuery["signals"][number]
>({
  useHook: ({ variables, fetchPolicy }) =>
    useListSignalsQuery({ variables: { pagination: variables.pagination }, fetchPolicy }),
  dataKey: "signals",
  ItemComponent: SignalCard,
  emptyTitle: "No signals received",
  emptyDescription: "Services announce created, updated and deleted objects here.",
  defaultLimit: 40,
  minItemWidth: 260,
  fetchPolicy: "cache-and-network",
});

export default SignalList;
