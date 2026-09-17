import { Separator } from "@/components/ui/separator";
import { TooltipButton } from "@/components/ui/tooltip-button";
import { EdgeContextualParams, FlowNode } from "@/reaktion/types";
import { DemandKind } from "@/rekuest/api/graphql";
import { X } from "lucide-react";
import { useMemo, useState } from "react";
import { useEditFlowStore, useEditNode } from "../context";
import { midpointBetween } from "../store/placement";
import { ActionSuggestions } from "./ActionSuggestions";
import { ContextualContainer } from "./ContextualContainer";
import { ReactiveSuggestions } from "./ReactiveSuggestions";
import { SearchForm, SearchValues } from "./SearchForm";
import { edgeSuggestions } from "./suggestions";
import { useActionNodeFactory } from "./subflow";
import { portDemand, useActionSearch } from "./useActionSearch";

/** An existing edge was clicked: remove it or splice a node into it. */
export const EdgeContextual = ({ params }: { params: EdgeContextualParams }) => {
  const left = useEditNode(params.leftNodeId);
  const right = useEditNode(params.rightNodeId);
  const removeEdge = useEditFlowStore((s) => s.removeEdge);
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
    () => edgeSuggestions(leftPorts, rightPorts, search),
    [leftPorts, rightPorts, search],
  );

  const wiring = {
    leftId: params.leftNodeId,
    leftStream: params.leftStream,
    rightId: params.rightNodeId,
    rightStream: params.rightStream,
    removeEdgeId: params.edgeId,
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
      <div className="text-xs text-muted-foreground relative mx-auto mb-2 w-full flex justify-between">
        <span>Transforms</span>
        <TooltipButton
          size="icon"
          variant="outline"
          onClick={() => removeEdge(params.edgeId)}
          className="text-red-800 w-5 h-5"
          tooltip="Remove Edge"
        >
          <X />
        </TooltipButton>
      </div>
      <SearchForm onSearch={setSearch} />
      <Separator />
      <ActionSuggestions actions={actions} error={error} onPick={onPickAction} />
      <Separator />
      <ReactiveSuggestions suggestions={reactive} onPick={onPickReactive} />
    </ContextualContainer>
  );
};
