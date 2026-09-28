import { createList } from "@/core/layout/createList";
import { BankPlace } from "@/bank/linkers";
import { useListMerchantLocationsQuery } from "../../api/graphql";
import PlaceCard from "../cards/PlaceCard";

const PlaceList = createList({
  useHook: useListMerchantLocationsQuery,
  dataKey: "merchantLocations",
  ItemComponent: PlaceCard,
  title: "Places",
  emptyTitle: "No places",
  smart: BankPlace,
  minItemWidth: 300,
});

export default PlaceList;
