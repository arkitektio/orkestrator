import React, { useContext } from "react";

export type TauriContextType = {};

export const TauriContext = React.createContext<TauriContextType>({});

export const useTauri = () => useContext(TauriContext);
