/**
 * The one widget set serves three surfaces: the editor, the read-only flow
 * viewer and the run tracker. What differs per surface is injected through a
 * `FlowAdapter`: which errors to show, whether edit controls exist, run
 * status per node, implementation dependencies.
 *
 * Invariant: an adapter is fixed for the whole `<ReactFlow>` subtree it is
 * provided to, so calling its hook members inside widgets is hook-order safe.
 */
import { RunEventFragment } from "@/fluss/api/graphql";
import { FlowNode } from "@/fluss/types";
import { ValidationError } from "@/fluss/validation/types";
import { ListDependencyFragment } from "@/rekuest/api/graphql";
import React, { createContext, useContext } from "react";
import { useStore } from "zustand";
import { useShallow } from "zustand/react/shallow";
import { EditFlowStore, EMPTY_ERRORS } from "../edit/store";
import { useShowRiver } from "../show/context";
import { useTrackRiver } from "../track/context";

export type FlowMode = "edit" | "show" | "track";

export type EditActions = {
  updateData: (data: Partial<FlowNode["data"]>, id: string) => void;
  moveConstantToStream: (nodeId: string, key: string, streamIndex: number) => void;
  moveStreamToConstants: (nodeId: string, streamIndex: number, itemIndex: number) => void;
  moveConstantToGlobals: (nodeId: string, key: string, globalKey?: string) => void;
  filterArgToConstant: (nodeId: string, streamIndex: number, itemIndex: number) => void;
  filterConstantToArg: (nodeId: string, key: string) => void;
  setAutoResolvable: (value: boolean, id: string) => void;
};

export type FlowAdapter = {
  mode: FlowMode;
  useNodeErrors: (id: string) => readonly ValidationError[];
  useShowNodeErrors: () => boolean;
  useShowEdgeLabels: () => boolean;
  useNodeStatus: (id: string) => RunEventFragment | undefined;
  useDependency: (id: string) => ListDependencyFragment | undefined;
  useSubflowChildCount: (id: string) => number;
  /** `null` outside the editor: widgets then render their read-only variant. */
  useEditActions: () => EditActions | null;
};

const noErrors = () => EMPTY_ERRORS;
const noStatus = () => undefined;
const noDependency = () => undefined;
const noEdit = () => null;
const zero = () => 0;
const off = () => false;

export const showAdapter: FlowAdapter = {
  mode: "show",
  useNodeErrors: noErrors,
  useShowNodeErrors: off,
  useShowEdgeLabels: () => useShowRiver().showEdgeLabels,
  useNodeStatus: noStatus,
  useDependency: (id) => {
    const { template } = useShowRiver();
    return template?.dependencies.find((dependency) => dependency.key === id);
  },
  useSubflowChildCount: zero,
  useEditActions: noEdit,
};

export const trackAdapter: FlowAdapter = {
  mode: "track",
  useNodeErrors: noErrors,
  useShowNodeErrors: off,
  useShowEdgeLabels: off,
  useNodeStatus: (id) => useTrackRiver().runState?.latestBySource?.get(id),
  useDependency: noDependency,
  useSubflowChildCount: zero,
  useEditActions: noEdit,
};

export const createEditAdapter = (store: EditFlowStore): FlowAdapter => ({
  mode: "edit",
  useNodeErrors: (id) => useStore(store, (s) => s.errorsByNodeId.get(id) ?? EMPTY_ERRORS),
  useShowNodeErrors: () => useStore(store, (s) => s.showNodeErrors),
  useShowEdgeLabels: () => useStore(store, (s) => s.showEdgeLabels),
  useNodeStatus: noStatus,
  useDependency: noDependency,
  useSubflowChildCount: (id) => useStore(store, (s) => s.childCountByParent.get(id) ?? 0),
  useEditActions: () =>
    useStore(
      store,
      useShallow((s) => ({
        updateData: s.updateData,
        moveConstantToStream: s.moveConstantToStream,
        moveStreamToConstants: s.moveStreamToConstants,
        moveConstantToGlobals: s.moveConstantToGlobals,
        filterArgToConstant: s.filterArgToConstant,
        filterConstantToArg: s.filterConstantToArg,
        setAutoResolvable: s.setAutoResolvable,
      })),
    ),
});

export const FlowAdapterContext = createContext<FlowAdapter>(showAdapter);

export const useFlowAdapter = () => useContext(FlowAdapterContext);

export const FlowAdapterProvider = ({
  adapter,
  children,
}: {
  adapter: FlowAdapter;
  children: React.ReactNode;
}) => <FlowAdapterContext.Provider value={adapter}>{children}</FlowAdapterContext.Provider>;
