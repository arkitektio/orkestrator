import { createList } from "@/core/layout/createList";
import { LokateTrip } from "@/core/linkers";
import { useListTripsQuery } from "@/lokate/api/graphql";
import TripCard from "../cards/TripCard";

const TList = createList({
  useHook: useListTripsQuery,
  dataKey: "trips",
  ItemComponent: TripCard,
  title: "Trips",
  smart: LokateTrip,
  // A page of its own says so when there is nothing, instead of going blank.
  autoHide: false,
  emptyTitle: "No trips recorded",
  minItemWidth: 220,
});

export default TList;
