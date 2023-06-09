import React, { useContext } from "react";
import { FlowFragment, RunFragment } from "../../fluss/api/graphql";
import { FlowNode, RunState } from "../types";

export type RiverTrackContextType = {
  flow?: FlowFragment | null;
  run?: RunFragment | null;
  live?: boolean;
  runState?: RunState | null;
  selectedNode?: FlowNode | null;
  setRunState: React.Dispatch<React.SetStateAction<RunState>>;
  setLive: React.Dispatch<React.SetStateAction<boolean>>;
};

export const RiverTrackContext = React.createContext<RiverTrackContextType>({
  setRunState: () => {
    console.error("WE ARE LACKING AN ENGINE");
  },
  setLive: () => {
    console.error("WE ARE LACKING AN ENGINE");
  },
});

export const useTrackRiver = () => useContext(RiverTrackContext);
