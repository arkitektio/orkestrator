import React, { useContext } from "react";
import { FlowFragment, GlobalFragment } from "../../fluss/api/graphql";
import { RunState } from "../types";

export type RiverTrackContextType = {
  flow?: FlowFragment | null;
  runState?: RunState;
};

export const RiverTrackContext = React.createContext<RiverTrackContextType>({});

export const useTrackRiver = () => useContext(RiverTrackContext);
