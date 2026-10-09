import { createList } from "@/core/layout/createList";
import { MikroLens } from "@/core/linkers";
import { useListLensesQuery } from "@/mikro/api/graphql";
import LensCard from "../cards/LensCard";

const TList = createList({
  useHook: useListLensesQuery,
  dataKey: "lenses",
  ItemComponent: LensCard,
  title: "Lenses",
  smart: MikroLens,
  // A page of its own says so when there is nothing, instead of going blank.
  autoHide: false,
  emptyTitle: "No lenses yet",
  emptyDescription:
    "A lens is a part cut out of an array dataset. Make one with New lens on a dataset's Lenses tab.",
  minItemWidth: 220,
});

export default TList;
