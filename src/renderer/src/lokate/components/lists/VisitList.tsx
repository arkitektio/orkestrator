import { createList } from "@/core/layout/createList";
import { LokateVisit } from "@/core/linkers";
import { useListVisitsQuery } from "@/lokate/api/graphql";
import VisitCard from "../cards/VisitCard";

const TList = createList({
  useHook: useListVisitsQuery,
  dataKey: "visits",
  ItemComponent: VisitCard,
  title: "Visits",
  smart: LokateVisit,
  // A page of its own says so when there is nothing, instead of going blank.
  autoHide: false,
  emptyTitle: "No visits recorded",
  minItemWidth: 220,
});

export default TList;
