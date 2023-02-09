import React, { useContext } from "react";
import { useQuery } from "@apollo/client";

export type ExperimentalContextType = {
  isExperimental: boolean;
  setExperimental: (isExperimental: boolean) => void;
};

export const ExperimentalContext = React.createContext<ExperimentalContextType>(
  {
    isExperimental: false,
    setExperimental: () => {},
  }
);

export const useExperimental = () => useContext(ExperimentalContext);
