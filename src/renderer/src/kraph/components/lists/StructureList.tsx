import { createList } from "@/core/layout/createList";
import { KraphStructure } from "@/core/linkers";
import { useListStructuresQuery } from "@/kraph/api/graphql";
import StructureCard from "../cards/StructureCard";

const TList = createList({
  useHook: useListStructuresQuery,
  dataKey: "structures",
  ItemComponent: StructureCard,
  title: "Structures",
  smart: KraphStructure,
  // A page of its own says so when there is nothing, instead of going blank.
  autoHide: false,
  emptyTitle: "No structures yet",
});

export default TList;
