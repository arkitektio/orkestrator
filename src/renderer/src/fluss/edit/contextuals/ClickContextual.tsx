import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ClickContextualParams, FlowNode } from "@/fluss/types";
import { ListAgentFragment, useAgentsQuery } from "@/rekuest/api/graphql";
import { useMemo, useState } from "react";
import { useEditFlowStore } from "../context";
import { buildAgentSubflowNode } from "../store/graph";
import { ActionSuggestions } from "./ActionSuggestions";
import { ContextualContainer } from "./ContextualContainer";
import { ReactiveSuggestions } from "./ReactiveSuggestions";
import { SearchForm, SearchValues } from "./SearchForm";
import { clickSuggestions } from "./suggestions";
import { useActionNodeFactory } from "./subflow";
import { useActionSearch } from "./useActionSearch";

const Agents = (props: { search?: string; onPick: (agent: ListAgentFragment) => void }) => {
  const variables = useMemo(
    () => ({ filters: { search: props.search }, pagination: { limit: 3 } }),
    [props.search],
  );
  const { data } = useAgentsQuery({ variables });

  return (
    <div className="flex flex-row gap-1 my-auto flex-wrap mt-2">
      {data?.agents.map((agent) => (
        <Tooltip key={agent.id}>
          <TooltipTrigger asChild>
            <Card
              onClick={() => props.onPick(agent)}
              className="px-2 py-1 border-solid border-2 border-chart-5 cursor-pointer"
            >
              {agent.name}
            </Card>
          </TooltipTrigger>
          <TooltipContent align="center">{agent.name}</TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
};

export const ClickContextual = ({ params }: { params: ClickContextualParams }) => {
  const [{ search, protocol }, setSearch] = useState<SearchValues>({});
  const addActionNodes = useEditFlowStore((s) => s.addActionNodes);
  const { fetchWrapped } = useActionNodeFactory();
  const { actions, error } = useActionSearch({ search, protocol, stateful: false, limit: 5 });
  const reactive = useMemo(() => clickSuggestions(search), [search]);

  const onPickAction = async (actionId: string) => {
    const fetched = await fetchWrapped(actionId, params.flowPosition);
    if (fetched) addActionNodes({ nodes: [fetched.parent, fetched.child] });
  };

  const onPickAgent = (agent: ListAgentFragment) =>
    addActionNodes({
      nodes: [
        buildAgentSubflowNode({
          appFilter: agent.app.identifier,
          title: agent.app.identifier,
          description: "A singular instance of the agent " + agent.app.identifier,
          versionFilter: agent.release.version,
          deviceFilter: agent.device?.id,
          userFilter: agent.user.sub,
          position: params.flowPosition,
        }) as FlowNode,
      ],
    });

  const onPickReactive = (node: FlowNode) =>
    addActionNodes({ nodes: [{ ...node, position: params.flowPosition }] });

  return (
    <ContextualContainer style={{ left: params.position.x, top: params.position.y }} active>
      <div className="text-xs text-muted-foreground inline relative mx-auto mb-2">All Nodes</div>
      <SearchForm onSearch={setSearch} />
      <Separator />
      <ActionSuggestions actions={actions} error={error} onPick={onPickAction} />
      <Separator />
      <Agents search={search} onPick={onPickAgent} />
      <Separator />
      <ReactiveSuggestions suggestions={reactive} onPick={onPickReactive} />
    </ContextualContainer>
  );
};
