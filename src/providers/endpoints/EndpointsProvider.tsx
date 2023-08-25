import { FaktsEndpoint } from "@jhnnsrs/fakts";
import React, { useContext, useState } from "react";

export type EndpointsContextType = {
  endpoints: FaktsEndpoint[];
  setEndpoints: React.Dispatch<React.SetStateAction<FaktsEndpoint[]>>;
};

export const EndpointsContext = React.createContext<EndpointsContextType>({
  endpoints: [],
  setEndpoints: () => {},
});

export const useEndpoints = () => useContext(EndpointsContext);

export const EndpointsProvider = ({
  children,
  staticEndpoints = [],
}: {
  children: React.ReactNode;
  staticEndpoints?: FaktsEndpoint[];
}) => {
  const [potentialEndpoints, setPotentialEndpoints] =
    useState<FaktsEndpoint[]>(staticEndpoints);

  return (
    <EndpointsContext.Provider
      value={{
        endpoints: potentialEndpoints,
        setEndpoints: setPotentialEndpoints,
      }}
    >
      {children}
    </EndpointsContext.Provider>
  );
};
