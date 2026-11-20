import { createList } from "@/core/layout/createList";
import { CARD_FRAME_MIN_WIDTH } from "@/core/ui/card-frame";
import { LokLayer } from "@/core/linkers";
import { useLayersQuery } from "@/lok/api/graphql";
import LayerCard from "../cards/LayerCard";

const LayerList = createList({
  useHook: useLayersQuery,
  dataKey: "layers",
  ItemComponent: LayerCard,
  title: "Layers",
  smart: LokLayer,
  // A page of its own says so when there is nothing, instead of going blank.
  autoHide: false,
  emptyTitle: "No layer",
  emptyDescription: "Layers group services so only the apps with access to a layer reach them.",
  minItemWidth: CARD_FRAME_MIN_WIDTH,
  defaultLimit: 40,
});

export default LayerList;
