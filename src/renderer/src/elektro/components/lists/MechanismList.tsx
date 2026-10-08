import { createList } from "@/core/layout/createList";
import { ElektroMechanism } from "@/core/linkers";
import { useListMechanismsQuery } from "@/elektro/api/graphql";
import MechanismCard from "../cards/MechanismCard";

const TList = createList({
  useHook: useListMechanismsQuery,
  dataKey: "mechanisms",
  ItemComponent: MechanismCard,
  title: "Mechanisms",
  smart: ElektroMechanism,
  // A page of its own says so when there is nothing, instead of going blank.
  autoHide: false,
  emptyTitle: "No mechanisms yet",
});

export default TList;
