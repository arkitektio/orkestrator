import { createList } from "@/core/layout/createList";
import { useListArrayDatasetsQuery } from "@/elektro/api/graphql";
import { ElektroArrayDataset } from "@/core/linkers";
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
