import React, { useContext } from "react";
import { FlowFragment, GlobalFragment } from "../../fluss/api/graphql";
import { ReserveState } from "../types";

export type RiverTrackContextType = {
  flow?: FlowFragment | null;
  reserveState?: ReserveState;
};

export const RiverMonitorContext = React.createContext<RiverTrackContextType>(
  {}
);

export const useMonitorRiver = () => useContext(RiverMonitorContext);
