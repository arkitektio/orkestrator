import { createList } from "@/core/layout/createList";
import { CARD_FRAME_MIN_WIDTH } from "@/core/ui/card-frame";
import { LokServiceInstance } from "@/core/linkers";
import { useListServiceInstancesQuery } from "@/lok/api/graphql";
import ServiceInstanceCard from "../cards/ServiceInstanceCard";

const InstancesList = createList({
  useHook: useListServiceInstancesQuery,
  dataKey: "serviceInstances",
  ItemComponent: ServiceInstanceCard,
  title: "Instances",
  smart: LokServiceInstance,
  // A page of its own says so when there is nothing, instead of going blank.
  autoHide: false,
  emptyTitle: "No instance",
  emptyDescription: "An instance is a service deployed on this server; press New Instance to add one.",
  minItemWidth: CARD_FRAME_MIN_WIDTH,
  defaultLimit: 40,
});

export default InstancesList;
