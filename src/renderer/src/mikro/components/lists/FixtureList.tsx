import { createList } from "@/core/layout/createList";
import { MikroFixture } from "@/core/linkers";
import { useListFixturesQuery } from "@/mikro/api/graphql";
import FixtureCard from "../cards/FixtureCard";

const TList = createList({
  useHook: useListFixturesQuery,
  dataKey: "fixtures",
  ItemComponent: FixtureCard,
  title: "Fixtures",
  smart: MikroFixture,
  minItemWidth: 220,
  autoHide: false,
  emptyTitle: "No fixtures yet",
});

export default TList;
