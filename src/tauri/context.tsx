import React, { useContext } from "react";

export type TauriContextType = {};

export const TauriContext = React.createContext<TauriContextType>({
  logout: () => {},
  login: () => {},
  setCode: () => {},
});

export const useTauri = () => useContext(TauriContext);
