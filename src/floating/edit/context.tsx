import React, { useContext } from "react";
import {
  ArkitektNodeFragment,
  FlowFragment,
  GlobalFragment,
  GraphInput,
  LocalNodeFragment,
  PortFragment,
  ReactiveNodeFragment,
} from "../../fluss/api/graphql";

import { FlowEdge, FlowNode } from "../types";

export type EditRiverContextType = {
  addArkitekt: (node: FlowNode<ArkitektNodeFragment>) => void;
  addLocal: (node: FlowNode<LocalNodeFragment>) => void;
  addReactive: (node: FlowNode<ReactiveNodeFragment>) => void;
  updateNodeIn: (id: string, data: any) => void;
  updateNodeOut: (id: string, data: any) => void;
  updateNodeExtras: (id: string, extras: any) => void;
  setDiagramError: (error: string) => void;
  saveDiagram: () => void;
  exportDiagram: () => GraphInput;
  setArgs: (args: (PortFragment | null)[]) => void;
  setGlobals: (globals: (GlobalFragment | null)[]) => void;
  setReturns: (args: (PortFragment | null)[]) => void;
  setNodeError: (id: string, error: string) => void;
  addGlobal: (global: GlobalFragment) => void;
  updateGlobal: (key: string, global: GlobalFragment) => void;
  removeEdge: (id: string) => void;
  setLayout: (direction: string) => void;
  globals?: (GlobalFragment | null)[] | null;
  flow: FlowFragment;
  nodes: FlowNode[];
  edges: FlowEdge[];
  args: (PortFragment | null)[];
  returns: (PortFragment | null)[];
  internalSignal: boolean;
  saving: boolean;
  selectedNode?: string;
};

export const EditRiverContext = React.createContext<EditRiverContextType>({
  addArkitekt: () => {
    console.error("WE ARE LACKING AN ENGINE");
  },
  addLocal: () => {
    console.error("WE ARE LACKING AN ENGINE");
  },
  addReactive: () => {
    console.error("WE ARE LACKING AN ENGINE");
  },
  saveDiagram: () => {
    console.error("WE ARE LACKING AN ENGINE");
  },
  exportDiagram: () => {
    throw Error("WE ARE LACKING AN ENGINE");
  },
  setNodeError: () => () => {
    console.error("WE ARE LACKING AN ENGINE");
  },
  updateNodeIn: () => {
    console.error("WE ARE LACKING AN ENGINE");
  },
  updateNodeExtras: () => {
    console.error("WE ARE LACKING AN ENGINE");
  },
  updateNodeOut: () => {
    console.error("WE ARE LACKING AN ENGINE");
  },
  setDiagramError: () => {
    console.error("WE ARE LACKING AN ENGINE");
  },
  addGlobal: () => {
    console.error("WE ARE LACKING AN ENGINE");
  },
  updateGlobal: () => {
    console.error("WE ARE LACKING AN ENGINE");
  },
  setGlobals: () => {},
  removeEdge: () => {},
  setArgs: () => {},
  setReturns: () => {},
  setLayout: () => {},
  nodes: [],
  flow: {
    id: "",
    name: "Fake Node",
    createdAt: "",
    __typename: "Flow",
    graph: { nodes: [], edges: [], args: [], returns: [], globals: [] },
  },
  edges: [],
  args: [],
  returns: [],
  saving: false,
  internalSignal: false,
});

export const useEditRiver = () => useContext(EditRiverContext);
