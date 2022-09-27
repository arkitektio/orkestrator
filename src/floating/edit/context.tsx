import React, { useContext } from "react";
import {
  ArgPortFragment,
  ArkitektNodeFragment,
  FlowFragment,
  GlobalFragment,
  ReactiveNodeFragment,
  ReturnPortFragment,
} from "../../fluss/api/graphql";

import { RiverMode, FlowNode, FlowEdge } from "../types";

export type EditRiverContextType = {
  addArkitekt: (node: FlowNode<ArkitektNodeFragment>) => void;
  addReactive: (node: FlowNode<ReactiveNodeFragment>) => void;
  updateNodeIn: (id: string, data: any) => void;
  updateNodeOut: (id: string, data: any) => void;
  updateNodeExtras: (id: string, extras: any) => void;
  setDiagramError: (error: string) => void;
  saveDiagram: () => void;
  setArgs: (args: (ArgPortFragment | null)[]) => void;
  setReturns: (args: (ReturnPortFragment | null)[]) => void;
  setNodeError: (id: string, error: string) => void;
  addGlobal: (global: GlobalFragment) => void;
  setSidebar: (sidebar: React.ReactNode) => void;
  updateGlobal: (key: string, global: GlobalFragment) => void;
  removeEdge: (id: string) => void;
  setLayout: (direction: string) => void;
  globals?: (GlobalFragment | null)[] | null;
  flow?: FlowFragment | null;
  nodes: FlowNode[];
  edges: FlowEdge[];
  args: (ArgPortFragment | null)[];
  returns: (ReturnPortFragment | null)[];
  saving: boolean;
};

export const EditRiverContext = React.createContext<EditRiverContextType>({
  addArkitekt: () => {
    console.error("WE ARE LACKING AN ENGINE");
  },
  addReactive: () => {
    console.error("WE ARE LACKING AN ENGINE");
  },
  saveDiagram: () => {
    console.error("WE ARE LACKING AN ENGINE");
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
  removeEdge: () => {},
  setSidebar: () => {},
  setArgs: () => {},
  setReturns: () => {},
  setLayout: () => {},
  nodes: [],
  edges: [],
  args: [],
  returns: [],
  saving: false,
});

export const useEditRiver = () => useContext(EditRiverContext);
