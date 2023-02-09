import { ApolloClient, NormalizedCacheObject } from "@apollo/client";
import React, { useEffect, useState } from "react";
import { useFakts } from "@jhnnsrs/fakts";
import { useHerre } from "herre";
import { ExperimentalContext } from "./context";

export type RekuestProviderProps = {
  children?: React.ReactNode;
};

export const ExperimentalProvider: React.FC<RekuestProviderProps> = ({
  children,
}) => {
  const [isExperimental, setIsExperimental] = useState(false);

  return (
    <ExperimentalContext.Provider
      value={{
        isExperimental,
        setExperimental: setIsExperimental,
      }}
    >
      {children}
    </ExperimentalContext.Provider>
  );
};
