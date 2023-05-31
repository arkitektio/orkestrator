import { useHerre } from "@jhnnsrs/herre";
import { listen } from "@tauri-apps/api/event";
import React, { useEffect } from "react";

export interface CallbackProps {}

export const TauriHerreCallback: React.FC<CallbackProps> = (props) => {
  const { setCode } = useHerre();

  useEffect(() => {
    console.log("Listening for code");
    const unlisten = listen("oauth://url", async (event) => {
      let url = event.payload as string;
      let code = url.split("code=")[1];

      setCode(code);
    });

    const unlistend = listen("oauth://invalid-url", async (event) => {
      console.log("Got code", event);
    });
    return () => {
      unlisten.then((f) => f());
      unlistend.then((f) => f());
    };
  }, []);

  return <></>;
};
