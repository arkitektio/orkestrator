import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropContextualParams,
  FlowNode,
  SubflowDropContextualParams,
} from "@/reaktion/types";
import { streamToReadable } from "@/reaktion/utils";
import { DemandKind } from "@/rekuest/api/graphql";
import type { Connection } from "@xyflow/react";
import { useCallback, useMemo, useState } from "react";
import { useEditFlowStore, useEditNode } from "../context";
import { parentNode } from "../store/graph";
import { positionInSubflow } from "../store/placement";
import { ActionSuggestions } from "./ActionSuggestions";
import { ContextualContainer } from "./ContextualContainer";
import { ReactiveSuggestions } from "./ReactiveSuggestions";
import { SearchForm, SearchValues } from "./SearchForm";
import { dropSuggestions } from "./suggestions";
import { useActionNodeFactory } from "./subflow";
import { portDemand, useActionSearch } from "./useActionSearch";

/**
 * A connection was dragged off a handle and dropped on the pane (or inside a
 * subflow wrapper). A source handle needs a new *target* node (we demand
 * matching args); a target handle needs a new *source* node (we demand
 * matching returns). Everything is committed as one `addActionNodes` write.
 */
export const DropContextual = ({
  params,
}: {
  params: DropContextualParams | SubflowDropContextualParams;
}) => {
  const causing = useEditNode(params.causingNodeId);
  const subflowId = "subflowNodeId" in params ? params.subflowNodeId : undefined;
  const subflow = useEditNode(subflowId);
  const addActionNodes = useEditFlowStore((s) => s.addActionNodes);
  const { fetchAction, fetchWrapped } = useActionNodeFactory();
  const [{ search, protocol }, setSearch] = useState<SearchValues>({});

  const addingTarget = params.handleType === "source";
  const ports = addingTarget
    ? causing?.data.outs.at(params.causingStream)
    : causing?.data.ins.at(params.causingStream);

  const demands = useMemo(
    () => [portDemand(addingTarget ? DemandKind.Args : DemandKind.Returns, ports)],
    [addingTarget, ports],
  );
  const appFilter = (subflow?.data as { appFilter?: string | null } | undefined)?.appFilter ?? undefined;
  const { actions, error } = useActionSearch({
    search,
    protocol,
    demands,
    appIdentifier: subflow ? appFilter : undefined,
    limit: 5,
  });

  const reactive = useMemo(
    () => (addingTarget ? dropSuggestions(ports, params.relativePosition, search) : []),
    [addingTarget, ports, params.relativePosition, search],
  );

  /** Places `node` (+ optional wrapper), wires it to the causing handle and commits. */
  const stage = useCallback(
    (node: FlowNode, wrapper?: FlowNode) => {
      if (!causing) return;
      const placed = subflow
        ? parentNode(node, subflow.id, positionInSubflow(params.flowPosition, subflow))
        : wrapper
          ? node
          : { ...node, position: params.flowPosition };

      // Only the `connection` is staged, never a pre-built edge as well:
      // `addActionNodes` integrates the connection into an edge of its own
      // (inserting transforms where needed), so handing it a second edge for
      // the same pair of handles produced two stacked wires.
      const connection: Connection = addingTarget
        ? { source: causing.id, sourceHandle: `return_${params.causingStream}`, target: placed.id, targetHandle: "arg_0" }
        : { source: placed.id, sourceHandle: "return_0", target: causing.id, targetHandle: `arg_${params.causingStream}` };

      addActionNodes({
        nodes: wrapper && !subflow ? [wrapper, placed] : [placed],
        connection,
      });
    },
    [addActionNodes, addingTarget, causing, params.causingStream, params.flowPosition, ports, subflow],
  );

  const onPickAction = async (actionId: string) => {
    if (subflow) {
      const fetched = await fetchAction(actionId, params.flowPosition);
      if (fetched) stage(fetched.node);
      return;
    }
    const fetched = await fetchWrapped(actionId, params.flowPosition);
    if (fetched) stage(fetched.child, fetched.parent);
  };

  if (!causing) return null;

  return (
    <ContextualContainer
      style={{ left: params.position.x, top: params.position.y, minWidth: subflow ? 320 : undefined }}
      active={actions.length > 0 || reactive.length > 0}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="text-xs text-muted-foreground inline relative mx-auto mb-2">
            {subflow
              ? `Add action to ${subflow.data.title}`
              : addingTarget
                ? "Add Target Node"
                : "Add Source Node"}
          </div>
        </TooltipTrigger>
        <TooltipContent align="center">
          {addingTarget ? "Consumes" : "Produces"} {streamToReadable(ports)}
        </TooltipContent>
      </Tooltip>

      <SearchForm onSearch={setSearch} />
      <Separator />
      {actions.length == 0 && reactive.length == 0 && !error && (
        <div className="my-auto mx-auto mt-2">No matching nodes found</div>
      )}
      <ActionSuggestions actions={actions} error={error} onPick={onPickAction} />
      {reactive.length > 0 && (
        <ReactiveSuggestions suggestions={reactive} onPick={(node) => stage(node)} dashed />
      )}
    </ContextualContainer>
  );
};
