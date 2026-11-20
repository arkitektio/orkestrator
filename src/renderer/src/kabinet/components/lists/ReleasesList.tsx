import { createList } from "@/core/layout/createList";
import { KabinetRelease } from "@/core/linkers";
import { useListReleasesQuery } from "../../api/graphql";
import ReleaseCard from "../cards/ReleaseCard";

const ReleasesList = createList({
  useHook: useListReleasesQuery,
  dataKey: "releases",
  ItemComponent: ReleaseCard,
  title: "Releases",
  smart: KabinetRelease,
  emptyTitle: "No release",
  emptyDescription: "Releases are read from the repositories you add.",
  minItemWidth: 272,
});

export default ReleasesList;
