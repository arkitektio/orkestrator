import { RekuestGuard } from "@/rekuest/api/hooks";
import { toast } from "@/core/ui/use-toast";
import { FlowFragment, GraphInput } from "@/fluss/api/graphql";
import { EditFlowCanvas } from "@/fluss/edit/components/EditFlowCanvas";
import { EditFlowStoreContext } from "@/fluss/edit/context";
import { RedoUndoHandler } from "@/fluss/edit/keyboardhandlers/RedoUndo";
import { createEditFlowStore } from "@/fluss/edit/store";
import { createEditAdapter, FlowAdapterProvider } from "@/fluss/nodes/adapter";
import { flowEdgeTypes, flowNodeTypes } from "@/fluss/nodes/flowTypes";
import { flowEdgeToInput, flowNodeToInput, globalToInput } from "@/fluss/utils";
import React, { useCallback, useEffect, useMemo, useRef } from "react";

export type SaveResult = FlowFragment | null | undefined | void;

export type Props = {
  flow: FlowFragment;
  /**
   * Persists the graph. Returning the saved `FlowFragment` lets the editor
   * adopt it (new flow id, server-normalised graph); returning nothing just
   * clears the dirty flag and waits for the refetched flow.
   */
  onSave?: (graph: GraphInput) => Promise<SaveResult> | SaveResult;
};

const RekuestRequired = () => (
  <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
    The workflow editor needs the Rekuest service, which is not available in this deployment.
  </div>
);

export const EditFlow: React.FC<Props> = ({ flow, onSave }) => {
  const reactFlowWrapperRef = useRef<HTMLDivElement | null>(null);
  const [store] = React.useState(() => createEditFlowStore(flow));
  const adapter = useMemo(() => createEditAdapter(store), [store]);

  useEffect(() => {
    store.getState().setRelativeWrapperRef(reactFlowWrapperRef);
  }, [store]);

  // Resync policy: a different flow (e.g. the version created by a save, or a
  // refetch) replaces the graph when there are no unsaved edits; otherwise it
  // is kept aside and the canvas offers to reload.
  useEffect(() => {
    const state = store.getState();
    if (flow.id === state.loadedFlowId) return;
    if (state.dirty) state.setIncomingFlow(flow);
    else state.loadFlow(flow);
  }, [flow, store]);

  const save = useCallback(async () => {
    const state = store.getState();
    if (state.remainingErrors.length > 0) {
      toast({
        title: "Workflow has errors",
        description: "Resolve the remaining validation errors before saving.",
      });
      return;
    }
    if (!onSave) return;

    const graph: GraphInput = {
      nodes: state.nodes.map((node) => flowNodeToInput(node)),
      edges: state.edges.map((edge) => flowEdgeToInput(edge)),
      globals: state.globals.map((globalArg) => globalToInput(globalArg)),
    };

    try {
      const saved = await onSave(graph);
      store.getState().markSaved(saved ?? undefined);
    } catch (error) {
      toast({
        title: "Saving failed",
        description: error instanceof Error ? error.message : String(error),
      });
    }
  }, [onSave, store]);

  return (
    <RekuestGuard unavailable={<RekuestRequired />}>
      <EditFlowStoreContext.Provider value={store}>
        <FlowAdapterProvider adapter={adapter}>
          <RedoUndoHandler />
          <EditFlowCanvas
            reactFlowWrapperRef={reactFlowWrapperRef}
            save={onSave ? save : undefined}
            nodeTypes={flowNodeTypes}
            edgeTypes={flowEdgeTypes}
          />
        </FlowAdapterProvider>
      </EditFlowStoreContext.Provider>
    </RekuestGuard>
  );
};
