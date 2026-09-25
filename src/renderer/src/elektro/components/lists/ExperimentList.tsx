
import { createList } from "@/core/components/layout/createList";
import { useListExperimentsQuery } from "@/elektro/api/graphql";
import { ElektroExperiment } from "@/core/linkers";
import ExperimentCard from "../cards/ExperimentCard";

const ExperimentList = createList({
  useHook: useListExperimentsQuery,
  dataKey: "experiments",
  ItemComponent: ExperimentCard,
  title: "Experiments",
  smart: ElektroExperiment,
});
export default ExperimentList;
