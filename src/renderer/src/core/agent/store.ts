import { useStore } from "zustand";
import { createStore } from "zustand/vanilla";

import { AgentState } from "./Agent";

export const initialAgentState: AgentState = {
  assignments: [],
  errors: [],
  connected: false,
  lastCode: undefined,
  lastReason: undefined,
};

export const agentStateStore = createStore<AgentState>(() => initialAgentState);

export const setAgentState = (state: AgentState) => {
  agentStateStore.setState(state);
};

export const resetAgentState = () => {
  agentStateStore.setState(initialAgentState);
};

export const useAgentState = <T,>(selector: (state: AgentState) => T) =>
  useStore(agentStateStore, selector);
