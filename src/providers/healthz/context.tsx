import React, { useContext } from "react";

export type HealthReturn = {
  name: string;
  ok?: HealthyJSON;
  error?: DeadJSON;
};

export type HealthyJSON = { [element: string]: string };

export type DeadJSON = {
  Connection: string;
  [element: string]: string;
};

export type HealthzContextType = {
  errors?: HealthReturn[];
};

export const HealthzContext = React.createContext<HealthzContextType>({});

export const useHealthz = () => useContext(HealthzContext);
