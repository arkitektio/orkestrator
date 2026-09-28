import { DetailRunFragment, RunStatus } from "@/fluss/api/graphql";
import { useNodesState } from "@xyflow/react";
import { AnimatePresence } from "framer-motion";
import React, { useEffect, useMemo, useState } from "react";
import { Graph } from "../base/Graph";
import { FlowAdapterProvider, trackAdapter } from "../nodes/adapter";
import { flowEdgeTypes, flowNodeTypes } from "../nodes/flowTypes";
import { edges_to_flowedges, nodes_to_flownodes } from "../utils";
import { LiveTracker } from "./components/tracker/LiveTracker";
import { RangeTracker } from "./components/tracker/RangeTracker";
import { TrackRiverContext, TrackRiverContextType } from "./context";
import { RunState } from "./types";

export type Props = {
  run: DetailRunFragment;
};

/** A flow with its run events overlaid (live subscription or scrubbable range). */
export const TrackFlow: React.FC<Props> = ({ run }) => {
  const [runState, setRunState] = useState<RunState>({ t: 0 });

  const initialNodes = useMemo(() => nodes_to_flownodes(run.flow.graph?.nodes || []), [run.flow]);
  const edges = useMemo(() => edges_to_flowedges(run.flow.graph?.edges || []), [run.flow]);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  useEffect(() => setNodes(initialNodes), [initialNodes, setNodes]);

  const context = useMemo<TrackRiverContextType>(
    () => ({ flow: run.flow, run, runState, setRunState }),
    [run, runState],
  );

  return (
    <TrackRiverContext.Provider value={context}>
      <FlowAdapterProvider adapter={trackAdapter}>
        <div className="h-full w-full flex flex-col relative" data-disableselect>
          <div className="flex flex-grow h-full w-full">
            <Graph
              nodes={nodes}
              edges={edges}
              elementsSelectable={true}
              nodeTypes={flowNodeTypes}
              onNodesChange={onNodesChange}
              edgeTypes={flowEdgeTypes}
              fitView
              attributionPosition="bottom-right"
            />
          </div>
          <AnimatePresence>
            <div className="w-full flex-initial" key="tracker">
              {run?.status != RunStatus.Completed ? (
                <LiveTracker run={run} startT={run?.latestSnapshot?.t || 0} />
              ) : (
                <RangeTracker run={run} />
              )}
            </div>
          </AnimatePresence>
        </div>
      </FlowAdapterProvider>
    </TrackRiverContext.Provider>
  );
};
