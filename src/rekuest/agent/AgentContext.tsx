import React, { useContext } from "react";
import {
  AssignationStatus,
  DefinitionInput,
  LogLevelInput,
  ProvisionMode,
  ProvisionStatus,
} from "../api/graphql";

export type ActorBuilderRegistry = {
  [idOfTemplate: string]: ActorBuilder | undefined;
};

export type Task = {
  abortController: AbortController;
  future: Promise<any>;
};

export type ProvisionRegistry = { [idOfProvision: string]: Actor };
export type AssignationsRegistry = {
  [idOfAssignation: string]: Task;
};

export type Token = string;

export type ActorBuilder = () => Actor;

export type AssignHelpers = {
  yield: (returns: any[]) => Promise<void>;
  return: (returns: any[]) => Promise<void>;
  done: () => Promise<void>;
  progress: (x: number) => Promise<void>;
  log: (level: LogLevelInput, message?: string) => Promise<void>;
  abortController: AbortController;
  assignation: AssignMessage;
};

export type Actor<T extends [] = []> = {
  onProvide?: (provision: any) => Promise<void>;
  onUnprovide?: (provision: any) => Promise<void>;
  onAssign: (helpers: AssignHelpers) => Promise<T | void>;
};

export type AgentContextType = {
  register: (
    on_interface: string,
    definition: DefinitionInput,
    actor: ActorBuilder
  ) => () => void;
  startProvide: () => Promise<void>;
  cancelProvide: () => Promise<void>;
  provide: boolean;
  registry?: ActorBuilderRegistry;
  provisions?: ProvisionRegistry;
  assignations?: AssignationsRegistry;
};

export type CommonAgentMessage = {
  id: string;
};

export type ListProvisionsProvision = {
  provision: string;
  template: string;
  status: ProvisionStatus;
};

export type ListAssignationsAssignation = {
  provisions: string;
  assignation: string;
};

export type ListProvisionsReply = CommonAgentMessage & {
  type: "LIST_PROVISIONS_REPLY";
  provisions: ListProvisionsProvision[];
};

export type ListAssignationsReply = CommonAgentMessage & {
  type: "LIST_ASSIGNATIONS_REPLY";
  assignations: ListAssignationsAssignation[];
};

export type AssignMessage = CommonAgentMessage & {
  type: "ASSIGN";
  args: any[];
  assignation: string;
  kwargs: { [key: string]: any };
  provision: string;
  reservation: string;
};

export type AgentInMessage =
  | ListProvisionsReply
  | ListAssignationsReply
  | AssignMessage;

export type ProvisionChangedMessage = CommonAgentMessage & {
  type: "PROVIDE_CHANGED";
  provision: string;
  status?: ProvisionStatus;
  message?: string;
  mode?: ProvisionMode;
};

export type AssignChangedMessage = CommonAgentMessage & {
  type: "ASSIGN_CHANGED";
  assignation: string;
  status?: AssignationStatus;
  returns?: any[];
  message?: string;
  progress?: number;
};

export type AssignLogMessage = CommonAgentMessage & {
  type: "ASSIGN_LOG";
  assignation: string;
  message?: string;
  level: LogLevelInput;
};

export type AgentOutMessage =
  | ProvisionChangedMessage
  | AssignChangedMessage
  | AssignLogMessage;

export type Replier = (message: AgentOutMessage) => void;

export const AgentContext = React.createContext<AgentContextType>({
  register: () => {
    return () => {};
  },
  startProvide: async () => {},
  cancelProvide: async () => {},
  provide: false,
  registry: {},
  provisions: {},
  assignations: {},
});

export const useAgent = () => useContext(AgentContext);
