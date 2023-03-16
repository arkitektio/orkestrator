import { invoke } from "@tauri-apps/api";
import React, { useEffect } from "react";
import { TauriContext } from "./context";
import { appWindow } from "@tauri-apps/api/window";

export type TauriProviderProps = {
  children?: React.ReactNode;
};

export const TauriProvider: React.FC<TauriProviderProps> = (props) => {
  useEffect(() => {
    if (window.__TAURI__) {
      console.log("Running within tauri");

      let dmini = document
        ?.getElementById("titlebar-minimize")
        ?.addEventListener("click", () => appWindow.minimize());
      let dmaxi = document
        ?.getElementById("titlebar-maximize")
        ?.addEventListener("click", () => appWindow.toggleMaximize());
      let dclose = document
        ?.getElementById("titlebar-close")
        ?.addEventListener("click", () => appWindow.close());

      return () => {
        document
          ?.getElementById("titlebar-minimize")
          ?.removeEventListener("click", () => appWindow.minimize());
        document
          ?.getElementById("titlebar-maximize")
          ?.removeEventListener("click", () => appWindow.toggleMaximize());
        document
          ?.getElementById("titlebar-close")
          ?.removeEventListener("click", () => appWindow.close());
      };
    }
  }, []);

  return (
    <TauriContext.Provider value={{}}>{props.children}</TauriContext.Provider>
  );
};
