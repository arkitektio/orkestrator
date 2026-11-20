import { createList } from "@/core/layout/createList";
import { KabinetFlavour } from "@/core/linkers";
import { useListFlavoursQuery } from "../../api/graphql";
import FlavourCard from "../cards/FlavourCard";

const FlavourList = createList({
  useHook: useListFlavoursQuery,
  dataKey: "flavours",
  ItemComponent: FlavourCard,
  title: "Flavours",
  smart: KabinetFlavour,
  emptyTitle: "No flavour",
  emptyDescription: "Flavours are the builds a release ships, read from your repositories.",
  minItemWidth: 272,
});

export default FlavourList;
