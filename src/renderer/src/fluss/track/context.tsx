import React, { useContext } from "react";
import { DetailRunFragment, FlowFragment } from "../api/graphql";
import { RunState } from "./types";

export type TrackRiverContextType = {
  flow?: FlowFragment | null;
  run?: DetailRunFragment | null;
  runState?: RunState | null;
  setRunState: React.Dispatch<React.SetStateAction<RunState>>;
};

export const TrackRiverContext = React.createContext<TrackRiverContextType>({
  setRunState: () => {
    console.error("TrackRiverContext used outside of a TrackFlow");
  },
});

export const useTrackRiver = () => useContext(TrackRiverContext);
