import { createList } from "@/core/layout/createList";
import { LovekitAgent } from "@/core/linkers";
import { useListAgentsQuery } from "@/lovekit/api/graphql";
import AgentCard from "../cards/AgentCard";

const TList = createList({
  useHook: useListAgentsQuery,
  dataKey: "agents",
  ItemComponent: AgentCard,
  title: "Agents",
  smart: LovekitAgent,
  minItemWidth: 220,
  autoHide: false,
  emptyTitle: "No agents yet",
});

export default TList;
