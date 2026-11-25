import { createList } from "@/core/layout/createList";
import { RekuestState } from "@/core/linkers";
import { useListStatesQuery } from "@/rekuest/api/graphql";
import StateCard from "../cards/StateCard";

const TList = createList({
  useHook: useListStatesQuery,
  dataKey: "states",
  ItemComponent: StateCard,
  title: "States",
  smart: RekuestState,
  minItemWidth: 220,
  // A page of its own says so when there is nothing, instead of going blank.
  autoHide: false,
  emptyTitle: "No states yet",
});

export default TList;
