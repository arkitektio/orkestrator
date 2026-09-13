import { useArkitektActions, useArkitektStore } from "@/lib/arkitekt/provider";
import { useArkitektStoreApi } from "@/lib/arkitekt/hooks";
import { useSettings } from "@/providers/settings/SettingsContext";
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useShallow } from "zustand/react/shallow";
import { useNavigate } from "react-router-dom";
import { AgentState, OrkestratorAgent } from "./Agent";
import { resetAgentState, setAgentState, useAgentState } from "./store";

export type AgentContextType = AgentState & {
  agent: OrkestratorAgent | null;
  disabled: boolean;
};

type AgentProviderContextType = {
  agent: OrkestratorAgent | null;
  disabled: boolean;
};

export const AgentContext = createContext<AgentProviderContextType>({
  agent: null,
  disabled: false,
});

const useAgentContext = () => useContext(AgentContext);

export const useAgent = (): AgentContextType => {
  const { agent, disabled } = useAgentContext();
  // The agent store is replaced wholesale on every socket message; shallow
  // compare so consumers only rerender when a top-level field changes.
  const state = useAgentState(useShallow((currentState) => currentState));

  return useMemo(
    () => ({
      ...state,
      agent,
      disabled,
    }),
    [agent, disabled, state],
  );
};

export const useAgentInstance = () => useAgentContext().agent;

export const AgentProvider: React.FC<{
  children: React.ReactNode;
  disabled?: boolean;
}> = ({
  children,
  disabled = false,
}) => {
  // The agent needs the merged Arkitekt context (store state + actions), but
  // this provider wraps the whole app, so it must not subscribe to the whole
  // store: it reads the state imperatively and subscribes outside React.
  const store = useArkitektStoreApi();
  const actions = useArkitektActions();
  const navigate = useNavigate();
  const { settings } = useSettings();
  const agentRef = useRef<OrkestratorAgent | null>(null);
  const [agent, setAgent] = useState<OrkestratorAgent | null>(null);

  // Keep `navigate` in a ref so it never appears in the effect deps below —
  // otherwise every navigation (react-router returns a fresh `navigate`) would
  // tear down and reconnect the agent.
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;

  // A stable identity for "the connection we're bound to": the endpoint. Token
  // refresh keeps the same endpoint, so it does not churn the agent.
  const connectionKey = useArkitektStore(
    (state) => state.connection?.endpoint?.base_url ?? null,
  );

  useEffect(() => {
    try {
      if (disabled || !connectionKey || !settings.startAgent) {
        if (agentRef.current) {
          agentRef.current.disconnect();
          agentRef.current = null;
        }
        setAgent(null);
        resetAgentState();
        return;
      }

      const newAgent = new OrkestratorAgent(
        { ...store.getState(), ...actions },
        (path) => navigateRef.current(path),
      );
      agentRef.current = newAgent;
      setAgent(newAgent);

      const unsubscribe = newAgent.subscribe((newState) => {
        setAgentState(newState);
      });

      newAgent.connect();

      console.log("AgentProvider: Agent started");

      return () => {
        unsubscribe();
        if (agentRef.current === newAgent) {
          agentRef.current = null;
          setAgent(null);
        }
        newAgent.disconnect();
        resetAgentState();
      };
    } catch (e) {
      resetAgentState();
      setAgent(null);
      agentRef.current = null;
      console.error("AgentProvider: Failed to start agent", e);
      return undefined;
    }
    // `store` and `actions` are stable for the provider's lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectionKey, disabled, settings.startAgent]);

  // Push token/context refreshes into the live agent WITHOUT reconnecting, and
  // without rerendering this provider on every store write.
  useEffect(
    () =>
      store.subscribe((state) => {
        agentRef.current?.setContext({ ...state, ...actions });
      }),
    [store, actions],
  );

  const contextValue = useMemo(
    () => ({
      agent,
      disabled,
    }),
    [agent, disabled],
  );

  return <AgentContext.Provider value={contextValue}>{children}</AgentContext.Provider>;
};
