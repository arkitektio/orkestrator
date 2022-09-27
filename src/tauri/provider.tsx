import { invoke } from "@tauri-apps/api";
import React, { useEffect } from "react";
import { TauriContext } from "./context";

export type TauriProviderProps = {
  children?: React.ReactNode;
};

export const TauriProvider: React.FC<TauriProviderProps> = (props) => {
  useEffect(() => {
    if (import.meta.env.TAURI) {
      console.log("Running within tauri");
      invoke("hello").then((user) => {
        console.log(user);
      });
    }
  }, []);

  return (
    <TauriContext.Provider value={{}}>{props.children}</TauriContext.Provider>
  );
};
