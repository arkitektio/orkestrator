import { createList } from "@/core/layout/createList";
import { ElektroEnvironment } from "@/core/linkers";
import { useListModEnvironmentsQuery } from "@/elektro/api/graphql";
import EnvironmentCard from "../cards/EnvironmentCard";

const TList = createList({
  useHook: useListModEnvironmentsQuery,
  dataKey: "modEnvironments",
  ItemComponent: EnvironmentCard,
  title: "Environments",
  smart: ElektroEnvironment,
  // A page of its own says so when there is nothing, instead of going blank.
  autoHide: false,
  emptyTitle: "No environments yet",
});

export default TList;
