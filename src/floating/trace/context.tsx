import React, { useContext } from "react";
import { ConditionFragment, FlowFragment } from "../../fluss/api/graphql";
import { ConditionState, FlowNode } from "../types";

export type RiverTraceContextType = {
  flow?: FlowFragment | null;
  condition?: ConditionFragment | null;
  conditionState?: ConditionState | null;
  selectedNode?: FlowNode | null;
  setConditionState: React.Dispatch<React.SetStateAction<ConditionState>>;
};

export const RiverTraceContext = React.createContext<RiverTraceContextType>({
  setConditionState: () => {
    console.error("WE ARE LACKING AN ENGINE");
  },
});

export const useTraceRiver = () => useContext(RiverTraceContext);
