import { createList } from "@/core/layout/createList";
import { KabinetPod } from "@/core/linkers";
import { useListPodQuery } from "../../api/graphql";
import PodCard from "../cards/PodCard";

const PodsList = createList({
  useHook: useListPodQuery,
  dataKey: "pods",
  ItemComponent: PodCard,
  title: "Pods",
  smart: KabinetPod,
  emptyTitle: "No pod",
  emptyDescription: "A pod is started from a deployment on a backend.",
  minItemWidth: 272,
});

export default PodsList;
