import { createList } from "@/core/layout/createList";
import { MikroLens } from "@/core/linkers";
import { useListLensesQuery } from "@/mikro/api/graphql";
import LensCard from "../cards/LensCard";

const shared = {
  useHook: useListLensesQuery,
  dataKey: "lenses",
  ItemComponent: LensCard,
  title: "Lenses",
  smart: MikroLens,
  minItemWidth: 220,
} as const;

const TList = createList({
  ...shared,
  // A page of its own says so when there is nothing, instead of going blank.
  autoHide: false,
  emptyTitle: "No lenses here",
  emptyDescription:
    "A lens is a part cut out of a dataset, a table, a mesh, a network or an annotation collection. Make one with New Lens on any of them.",
});

/**
 * The same list as a SECTION of another page (the dashboard): hidden when
 * empty, since those pages say nothing about what is not there. `autoHide` is
 * a factory option, hence a second list.
 */
export const LensSectionList = createList({ ...shared });

export default TList;

/**
 * The home page's DATA: the whole lens of every container, one tile per
 * dataset, table, mesh, network and annotation collection. Pass
 * `filters={{ sliced: false }}`. Not auto-hidden: it is what the page is for,
 * so a search that excludes everything says so.
 */
export const DataLensList = createList({
  ...shared,
  title: "Data",
  minItemWidth: 260,
  defaultLimit: 30,
  autoHide: false,
  emptyTitle: "No data found",
  emptyDescription: "Nothing matches these filters.",
});
