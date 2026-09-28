import { Button } from "@/core/ui/button";
import { Card } from "@/core/ui/card";
import { Graph } from "@/fluss/base/Graph";
import { useEditFlowStore, useEditFlowStoreApi } from "@/fluss/edit/context";
import { EdgeTypes, NodeTypes } from "@/fluss/types";
import React, { RefObject } from "react";
import { useStore } from "zustand";
import { useShallow } from "zustand/react/shallow";
import { DelegatingContextual } from "../contextuals/DelegatingContextual";
import { DefaultControls } from "../overlays/DefaultControls";
import { ErrorOverlay } from "../overlays/Error";

type Props = {
  reactFlowWrapperRef: RefObject<HTMLDivElement | null>;
  save?: () => void;
  nodeTypes: NodeTypes;
  edgeTypes: EdgeTypes;
};

/** A newer version of the flow arrived while there are unsaved edits. */
const IncomingFlowBanner = () => {
  const incoming = useEditFlowStore((s) => s.incomingFlow);
  const loadFlow = useEditFlowStore((s) => s.loadFlow);
  const dismiss = useEditFlowStore((s) => s.dismissIncoming);
  if (!incoming) return null;
  return (
    <Card className="absolute top-14 left-1/2 -translate-x-1/2 z-50 flex flex-row items-center gap-3 px-4 py-2 border text-sm">
      <span>A newer version of this workflow was saved elsewhere.</span>
      <Button size="sm" variant="outline" onClick={() => loadFlow(incoming)}>
        Reload
      </Button>
      <Button size="sm" variant="ghost" onClick={dismiss}>
        Keep editing
      </Button>
    </Card>
  );
};

const SaveCard = ({ save }: { save: () => void }) => {
  const hasErrors = useEditFlowStore((s) => s.remainingErrors.length > 0);
  const dirty = useEditFlowStore((s) => s.dirty);
  if (hasErrors) return null;
  return (
    <div className="flex h-9 items-center gap-2 rounded-lg border bg-card px-1 shadow-sm">
      {dirty && <span className="pl-2 text-xs text-muted-foreground">Unsaved changes</span>}
      <Button onClick={save}>Save</Button>
    </div>
  );
};

const Contextuals = () => {
  const contextuals = useEditFlowStore((s) => s.contextuals);
  return (
    <>
      {contextuals.map((contextual) => (
        <DelegatingContextual key={contextual.id} contextual={contextual} />
      ))}
    </>
  );
};

export const EditFlowCanvas: React.FC<Props> = ({ reactFlowWrapperRef, save, nodeTypes, edgeTypes }) => {
  const store = useEditFlowStoreApi();
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnectStart,
    onConnectEnd,
    onConnect,
    onPaneClick,
    onNodeClick,
    onNodeDoubleClick,
    onEdgeClick,
    setReactFlowInstance,
  } = useStore(
    store,
    useShallow((state) => ({
      nodes: state.nodes,
      edges: state.edges,
      onNodesChange: state.onNodesChange,
      onEdgesChange: state.onEdgesChange,
      onConnectStart: state.onConnectStart,
      onConnectEnd: state.onConnectEnd,
      onConnect: state.onConnect,
      onPaneClick: state.onPaneClick,
      onNodeClick: state.onNodeClick,
      onNodeDoubleClick: state.onNodeDoubleClick,
      onEdgeClick: state.onEdgeClick,
      setReactFlowInstance: state.setReactFlowInstance,
    })),
  );

  return (
    <div ref={reactFlowWrapperRef} className="flex flex-grow h-full w-full relative" data-disableselect>
      <ErrorOverlay />
      <IncomingFlowBanner />
      <Contextuals />
      <Graph
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnectStart={onConnectStart}
        onConnectEnd={onConnectEnd}
        onConnect={onConnect}
        onPaneClick={onPaneClick}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={onNodeDoubleClick}
        onEdgeClick={onEdgeClick}
        elementsSelectable={true}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onInit={setReactFlowInstance}
        fitView
        attributionPosition="bottom-right"
        proOptions={{ hideAttribution: true }}
      />
      <div className="absolute bottom-3 right-3 z-50 flex items-center gap-2">
        <DefaultControls />
        {save && <SaveCard save={save} />}
      </div>
    </div>
  );
};
