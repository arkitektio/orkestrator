
import { createList } from "@/core/layout/createList";
import { useListNeuronModelsQuery } from "@/elektro/api/graphql";
import { ElektroNeuronModel } from "@/core/linkers";
import NeuronModelCard from "../cards/NeuronModelCard";

const TList = createList({
  useHook: useListNeuronModelsQuery,
  dataKey: "neuronModels",
  ItemComponent: NeuronModelCard,
  title: "Neuron Models",
  smart: ElektroNeuronModel,
});
export default TList;
