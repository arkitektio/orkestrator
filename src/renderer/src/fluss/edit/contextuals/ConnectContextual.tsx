import { Separator } from "@/components/ui/separator";
import { ConnectContextualParams, FlowNode } from "@/fluss/types";
import { streamToReadable } from "@/fluss/utils";
import { DemandKind } from "@/rekuest/api/graphql";
import { useMemo, useState } from "react";
import { useEditFlowStore, useEditNode } from "../context";
import { midpointBetween } from "../store/placement";
import { ActionSuggestions } from "./ActionSuggestions";
import { ContextualContainer } from "./ContextualContainer";
import { ReactiveSuggestions } from "./ReactiveSuggestions";
import { SearchForm, SearchValues } from "./SearchForm";
import { connectSuggestions } from "./suggestions";
import { useActionNodeFactory } from "./subflow";
import { portDemand, useActionSearch } from "./useActionSearch";

/** Two nodes were connected but their streams don't match: insert something between. */
export const ConnectContextual = ({ params }: { params: ConnectContextualParams }) => {
  const left = useEditNode(params.leftNodeId);
  const right = useEditNode(params.rightNodeId);
  const insertBetween = useEditFlowStore((s) => s.insertBetween);
  const { fetchWrapped } = useActionNodeFactory();
  const [{ search, protocol }, setSearch] = useState<SearchValues>({});

  const leftPorts = left?.data.outs.at(params.leftStream);
  const rightPorts = right?.data.ins.at(params.rightStream);

  const demands = useMemo(
    () => [portDemand(DemandKind.Args, leftPorts), portDemand(DemandKind.Returns, rightPorts)],
    [leftPorts, rightPorts],
  );
  const { actions, error } = useActionSearch({ search, protocol, demands, limit: 5 });
  const reactive = useMemo(
    () => connectSuggestions(leftPorts, rightPorts, search),
    [leftPorts, rightPorts, search],
  );

  const wiring = {
    leftId: params.leftNodeId,
    leftStream: params.leftStream,
    rightId: params.rightNodeId,
    rightStream: params.rightStream,
  };

  const onPickReactive = (node: FlowNode) => {
    if (!left || !right) return;
    insertBetween({ node: { ...node, position: midpointBetween(left, right) }, ...wiring });
  };

  const onPickAction = async (actionId: string) => {
    if (!left || !right) return;
    const fetched = await fetchWrapped(actionId, midpointBetween(left, right));
    if (fetched) insertBetween({ node: fetched.child, wrapper: fetched.parent, ...wiring });
  };

  if (!left || !right) return null;

  return (
    <ContextualContainer style={{ left: params.position.x, top: params.position.y }} active>
      <div className="text-xs text-muted-foreground inline relative mx-auto mb-2">
        {streamToReadable(leftPorts)} <b>to</b> {streamToReadable(rightPorts)}
      </div>
      <SearchForm onSearch={setSearch} />
      <Separator />
      <ActionSuggestions actions={actions} error={error} onPick={onPickAction} />
      <ReactiveSuggestions suggestions={reactive} onPick={onPickReactive} />
    </ContextualContainer>
  );
};
