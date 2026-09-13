import { handleToStream, streamToReactNode } from "@/reaktion/utils";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  useStore,
} from "@xyflow/react";
import { MergeIcon } from "lucide-react";
import React from "react";
import { FlowNode, VanillaEdgeProps } from "../../types";
import { useEditFlowStore } from "../context";

const connectionNodeIdSelector = (state: any) => state.connectionNodeId;

export const LabeledShowEdge: React.FC<VanillaEdgeProps> = (props) => {
  const {
    id,
    sourcePosition,
    targetPosition,
    targetHandleId,
    sourceX,
    sourceY,
    targetX,
    targetY,
    target,
    style,
    markerEnd,
  } = props;

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourcePosition,
    targetPosition,
    sourceX,
    sourceY,
    targetX,
    targetY,
  });

  const connectionNodeId = useStore(connectionNodeIdSelector);

  const isConnecting = !!connectionNodeId;

  const showEdgeLabels = useEditFlowStore((s) => s.showEdgeLabels);

  // O(1) lookup of the target node; `useNodes().find(...)` subscribed every
  // edge to the whole node array and scanned it on every drag tick.
  const targetIns = useStore(
    (state) =>
      (state.nodeLookup.get(target) as FlowNode | undefined)?.data?.ins,
  );

  return (
    <>
      <BaseEdge
        id={id}
        style={{
          ...(style || {}),
          strokeWidth: 1,
        }}
        path={edgePath}
        markerEnd={markerEnd}
        interactionWidth={20}
      />
      <EdgeLabelRenderer>
        {(isConnecting || showEdgeLabels) && (
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: "all",
            }}
            data-edgeid={id}
            className="nodrag nopan rounded group rounded-md border:bg-slate-400 border bg-gray-800 dark:bg-sidebar dark:text-gray-800 text-gray-200 py-0 px-1 hover:px-4 transition-all duration-300 group-hover:opacity-100 stream-edge-label z-50 text-xs"
          >
            {isConnecting && (
              <MergeIcon
                className="rotate-90 text-foreground w-3 h-4 group-hover:h-8  group-hover:w-8 transition-all duration-300 group-hover:opacity-100"
                data-edgeid={id}
              />
            )}
            {showEdgeLabels && (
              <div
                className="flex flex-row gap-2 text-xs font-light"
                data-edgeid={id}
              >
                {streamToReactNode(
                  targetIns?.at(handleToStream(targetHandleId)),
                )}
              </div>
            )}
          </div>
        )}
      </EdgeLabelRenderer>
    </>
  );
};
