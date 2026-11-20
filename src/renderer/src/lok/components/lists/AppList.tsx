import { createList } from "@/core/layout/createList";
import { CARD_FRAME_MIN_WIDTH } from "@/core/ui/card-frame";
import { LokApp } from "@/core/linkers";
import { useAppsQuery } from "@/lok/api/graphql";
import AppCard from "../cards/AppCard";

const AppList = createList({
  useHook: useAppsQuery,
  dataKey: "apps",
  ItemComponent: AppCard,
  title: "Apps",
  smart: LokApp,
  // A page of its own says so when there is nothing, instead of going blank.
  autoHide: false,
  emptyTitle: "No app",
  emptyDescription: "Apps appear once they register with your organization.",
  minItemWidth: CARD_FRAME_MIN_WIDTH,
  defaultLimit: 40,
});

export default AppList;
