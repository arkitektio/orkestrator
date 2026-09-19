import { createList } from "@/components/layout/createList";
import { useListArrayDatasetsQuery } from "@/elektro/api/graphql";
import { ElektroArrayDataset } from "@/linkers";
import ArrayDatasetCard from "../cards/ArrayDatasetCard";

const ArrayDatasetList = createList({
  useHook: useListArrayDatasetsQuery,
  dataKey: "arrayDatasets",
  ItemComponent: ArrayDatasetCard,
  title: "Datasets",
  smart: ElektroArrayDataset,
  defaultLimit: 30,
});
export default ArrayDatasetList;
