import { createList } from "@/core/layout/createList";
import { KabinetResource } from "@/core/linkers";
import { useListResourcesQuery } from "../../api/graphql";
import ResourceCard from "../cards/ResourceCard";

const ResourceList = createList({
  useHook: useListResourcesQuery,
  dataKey: "resources",
  ItemComponent: ResourceCard,
  title: "Resources",
  smart: KabinetResource,
  emptyTitle: "No resource",
  emptyDescription: "Backends report the resources they run pods on.",
  minItemWidth: 272,
});

export default ResourceList;
