import { listen } from "@tauri-apps/api/event";
import React, { useEffect } from "react";
import { useHerre } from "herre";

export interface CallbackProps {}

export const TauriHerreCallback: React.FC<CallbackProps> = (props) => {
  const { setCode } = useHerre();

  useEffect(() => {
    const unlisten = listen("code", async (event) => {
      setCode(event.payload as string);
    });
    return () => {
      unlisten.then((f) => f());
    };
  }, []);

  return <></>;
};
