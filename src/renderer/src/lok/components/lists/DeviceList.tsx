import { createList } from "@/core/layout/createList";
import { CARD_FRAME_MIN_WIDTH } from "@/core/ui/card-frame";
import { LokDevice } from "@/core/linkers";
import { useBrowseDevicesQuery } from "@/lok/api/graphql";
import DeviceCard from "../cards/DeviceCard";

const DeviceList = createList({
  useHook: useBrowseDevicesQuery,
  dataKey: "devices",
  ItemComponent: DeviceCard,
  title: "Devices",
  smart: LokDevice,
  autoHide: false,
  emptyTitle: "No device",
  emptyDescription: "A device appears once it is provisioned and registers with your organization.",
  minItemWidth: CARD_FRAME_MIN_WIDTH,
  defaultLimit: 40,
});

export default DeviceList;
