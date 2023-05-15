import React, { useContext } from "react";

export type TauriContextType = {
  intauri: boolean;
};

export const TauriContext = React.createContext<TauriContextType>({
  intauri: false,
});

export const useTauri = () => useContext(TauriContext);
