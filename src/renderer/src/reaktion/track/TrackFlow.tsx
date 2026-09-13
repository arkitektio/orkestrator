import {
  DetailRunFragment,
  GraphInput,
  RunStatus,
} from "@/reaktion/api/graphql";
import { DetailTaskFragment } from "@/rekuest/api/graphql";
import { NodeProps, EdgeProps, useNodesState } from "@xyflow/react";
import { AnimatePresence } from "framer-motion";
import React, { useRef, useState } from "react";
import { Graph } from "../base/Graph";
import { EdgeTypes, FlowNode, NodeTypes } from "../types";
import { edges_to_flowedges, nodes_to_flownodes } from "../utils";
import { LiveTracker } from "./components/tracker/LiveTracker";
import { RangeTracker } from "./components/tracker/RangeTracker";
import { TrackRiverContext } from "./context";
import { LabeledShowEdge } from "./edges/LabeledShowEdge";
import { ReactiveTrackNodeWidget } from "./nodes/ReactiveWidget";
import { RekuestFilterWidget } from "./nodes/RekuestFilterWidget";
import { RekuestMapWidget } from "./nodes/RekuestMapWidget";
import { ArgTrackNodeWidget } from "./nodes/generic/ArgShowNodeWidget";
import { AgentSubFlowTrackNodeWidget } from "./nodes/generic/AgentSubFlowShowNodeWidget";
import { ReturnTrackNodeWidget } from "./nodes/generic/ReturnShowNodeWidget";
import { RunState } from "./types";

const nodeTypes: NodeTypes = {
  RekuestFilterActionNode: RekuestFilterWidget as React.FC<NodeProps>,
  RekuestMapActionNode: RekuestMapWidget as React.FC<NodeProps>,
  ReactiveNode: ReactiveTrackNodeWidget as React.FC<NodeProps>,
  ArgNode: ArgTrackNodeWidget as React.FC<NodeProps>,
  ReturnNode: ReturnTrackNodeWidget as React.FC<NodeProps>,
  AgentSubFlowNode: AgentSubFlowTrackNodeWidget as React.FC<NodeProps>,
};

const edgeTypes: EdgeTypes = {
  VanillaEdge: LabeledShowEdge as React.FC<EdgeProps>,
  LoggingEdge: LabeledShowEdge as React.FC<EdgeProps>,
};

export type Props = {
  run: DetailRunFragment;
  task?: DetailTaskFragment;
  onSave?: (graph: GraphInput) => void;
};

export const TrackFlow: React.FC<Props> = ({ run }) => {

  const reactFlowWrapper = useRef<HTMLDivElement | null>(null);

  const [runState, setRunState] = useState<RunState>({ t: 0 });
  const [live, setLive] = useState<boolean>(true);

  const [nodes, , onNodesChange] = useNodesState(
    nodes_to_flownodes(run.flow.graph?.nodes || []) || [],
  );
  const edges = edges_to_flowedges(run.flow.graph?.edges || []);

  const [selectedNode] = useState<FlowNode | null>(null);

  return (
    <TrackRiverContext.Provider
      value={{
        flow: run.flow,
        runState: runState,
        selectedNode,
        setRunState: setRunState,
        run: run,
        live,
        setLive,
      }}
    >
      <div
        ref={reactFlowWrapper}
        className="h-full w-full flex flex-col relative "
        data-disableselect
      >
        <div className="flex flex-grow h-full w-full">
          <Graph
            nodes={nodes}
            edges={edges}
            elementsSelectable={true}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            edgeTypes={edgeTypes}
            fitView
            attributionPosition="bottom-right"
          ></Graph>
        </div>
        <AnimatePresence>
          <div className=" w-full flex-initial ">
            {run?.status != RunStatus.Completed ? (
              <LiveTracker run={run} startT={run?.latestSnapshot?.t || 0} />
            ) : (
              <RangeTracker run={run} />
            )}
          </div>
        </AnimatePresence>
      </div>
    </TrackRiverContext.Provider>
  );
};
