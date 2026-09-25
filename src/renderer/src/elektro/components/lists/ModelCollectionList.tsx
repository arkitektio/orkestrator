
import { createList } from "@/core/components/layout/createList";
import { useListModelCollectionsQuery } from "@/elektro/api/graphql";
import { ElektroModelCollection } from "@/core/linkers";
import ModelCollectionCard from "../cards/ModelCollectionCard";

const TList = createList({
  useHook: useListModelCollectionsQuery,
  dataKey: "modelCollections",
  ItemComponent: ModelCollectionCard,
  title: "Model Collections",
  smart: ElektroModelCollection,
});
export default TList;
