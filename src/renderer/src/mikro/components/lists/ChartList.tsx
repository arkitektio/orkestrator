import { createList } from "@/core/layout/createList";
import { MikroChart } from "@/core/linkers";
import { useGetChartsQuery } from "@/mikro/api/graphql";
import ChartCard from "../cards/ChartCard";

const shared = {
  useHook: useGetChartsQuery,
  dataKey: "charts",
  ItemComponent: ChartCard,
  title: "Charts",
  smart: MikroChart,
  minItemWidth: 220,
} as const;

const TList = createList({
  ...shared,
  // A page of its own says so when there is nothing, instead of going blank.
  autoHide: false,
  emptyTitle: "No charts yet",
});

/**
 * The same list as a SECTION of another page (the dashboard, a coordinate
 * system's rail): hidden when empty, since those pages say nothing about what
 * is not there. `autoHide` is a factory option, hence a second list.
 */
export const ChartSectionList = createList({ ...shared });

export default TList;
