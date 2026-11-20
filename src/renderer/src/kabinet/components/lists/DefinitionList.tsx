import { createList } from "@/core/layout/createList";
import { KabinetDefinition } from "@/core/linkers";
import { useListDefinitionsQuery } from "../../api/graphql";
import DefinitionCard from "../cards/DefinitionCard";

const DefinitionList = createList({
  useHook: useListDefinitionsQuery,
  dataKey: "definitions",
  ItemComponent: DefinitionCard,
  title: "Definitions",
  smart: KabinetDefinition,
  emptyTitle: "No definition",
  emptyDescription: "Definitions are the actions the releases of your repositories register.",
  minItemWidth: 272,
});

export default DefinitionList;
