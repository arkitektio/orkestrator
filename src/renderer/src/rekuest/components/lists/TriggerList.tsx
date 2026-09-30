import { createList } from "@/core/layout/createList";
import { ListTriggersQuery, useListTriggersQuery } from "@/rekuest/api/graphql";
import TriggerCard from "../automation/TriggerCard";

const TriggerList = createList<
  ListTriggersQuery,
  never,
  never,
  never,
  ListTriggersQuery["triggers"][number]
>({
  useHook: ({ variables, fetchPolicy }) =>
    useListTriggersQuery({ variables: { pagination: variables.pagination }, fetchPolicy }),
  dataKey: "triggers",
  ItemComponent: TriggerCard,
  emptyTitle: "No triggers yet",
  emptyDescription: "Run an action whenever a service signals a new or changed object.",
  defaultLimit: 30,
  minItemWidth: 260,
});

export default TriggerList;
