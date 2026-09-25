import { createList } from "@/components/layout/createList";
import { MikroArrayDataset } from "@/linkers";
import { useGetArrayDatasetsQuery } from "../../api/graphql";
import ArrayDatasetCard from "../cards/ArrayDatasetCard";

/**
 * On the shared factory rather than a hand-rolled ListRender, because the filter
 * bar needs what it provides: ordering, an offset reset when the filters change,
 * and an empty state.
 *
 * `autoHide: false` matters here — the factory's default is to render nothing
 * when a list comes back empty, which for a filtered page looks like the page
 * failed rather than like the filters excluded everything.
 *
 * `minItemWidth` because the card is a picture with a spec readout over it: the
 * grid's default ladder would pack it into a column too narrow to read either.
 */
const TList = createList({
  useHook: useGetArrayDatasetsQuery,
  dataKey: "arrayDatasets",
  ItemComponent: ArrayDatasetCard,
  title: "Array Datasets",
  smart: MikroArrayDataset,
  defaultLimit: 30,
  minItemWidth: 260,
  autoHide: false,
  emptyTitle: "No array datasets found",
  emptyDescription: "Nothing matches these filters.",
});

export default TList;
