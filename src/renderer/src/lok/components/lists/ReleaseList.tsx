import { createList } from "@/core/layout/createList";
import { CARD_FRAME_MIN_WIDTH } from "@/core/ui/card-frame";
import { LokRelease } from "@/core/linkers";
import { useReleasesQuery } from "@/lok/api/graphql";
import ReleaseCard from "../cards/ReleaseCard";

/** Every app's releases, newest first, a page at a time. */
const ReleaseList = createList({
  useHook: useReleasesQuery,
  dataKey: "releases",
  ItemComponent: ReleaseCard,
  title: "Releases",
  smart: LokRelease,
  autoHide: false,
  emptyTitle: "No release",
  emptyDescription: "Releases appear once an app registers one with your organization.",
  minItemWidth: CARD_FRAME_MIN_WIDTH,
  defaultLimit: 40,
});

export default ReleaseList;
