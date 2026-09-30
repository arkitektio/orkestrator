import { createList } from "@/core/layout/createList";
import { ListSchedulesQuery, useListSchedulesQuery } from "@/rekuest/api/graphql";
import ScheduleCard from "../automation/ScheduleCard";

const ScheduleList = createList<
  ListSchedulesQuery,
  never,
  never,
  never,
  ListSchedulesQuery["schedules"][number]
>({
  useHook: ({ variables, fetchPolicy }) =>
    useListSchedulesQuery({ variables: { pagination: variables.pagination }, fetchPolicy }),
  dataKey: "schedules",
  ItemComponent: ScheduleCard,
  emptyTitle: "No schedules yet",
  emptyDescription: "Put an action on a clock from its menu, or with New schedule.",
  defaultLimit: 30,
  minItemWidth: 260,
});

export default ScheduleList;
