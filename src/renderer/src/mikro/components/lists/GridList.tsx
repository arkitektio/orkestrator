import { createList } from "@/core/layout/createList";
import { MikroGrid } from "@/core/linkers";
import { useGetGridsQuery } from "@/mikro/api/graphql";
import GridCard from "../cards/GridCard";

const shared = {
  useHook: useGetGridsQuery,
  dataKey: "grids",
  ItemComponent: GridCard,
  title: "Grids",
  smart: MikroGrid,
  minItemWidth: 220,
} as const;

const TList = createList({ ...shared, autoHide: false, emptyTitle: "No grids yet" });

/** As a section of another page: hidden when empty. */
export const GridSectionList = createList({ ...shared });

export default TList;
