import { createList } from "@/core/layout/createList";
import { CARD_FRAME_MIN_WIDTH } from "@/core/ui/card-frame";
import { LokService } from "@/core/linkers";
import { useListServicesQuery } from "@/lok/api/graphql";
import ServiceCard from "../cards/ServiceCard";

const ServiceList = createList({
  useHook: useListServicesQuery,
  dataKey: "services",
  ItemComponent: ServiceCard,
  title: "Services",
  smart: LokService,
  // A page of its own says so when there is nothing, instead of going blank.
  autoHide: false,
  emptyTitle: "No service",
  emptyDescription: "Services are the kinds of backend a server can run.",
  minItemWidth: CARD_FRAME_MIN_WIDTH,
  defaultLimit: 40,
});

export default ServiceList;
