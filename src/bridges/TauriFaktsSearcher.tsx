import { Beacon, introspectUrl } from "@jhnnsrs/fakts";
import { listen } from "@tauri-apps/api/event";
import React, { useEffect } from "react";
import { useEndpoints } from "../providers/endpoints/EndpointsProvider";

export interface CallbackProps {}

export interface ConfigValues {
  host: string;
}

export const TauriFaktsSearcher: React.FC<CallbackProps> = (props) => {
  const { setEndpoints } = useEndpoints();

  const subscribe = async () => {
    return listen("fakts", async (event) => {
      try {
        let beacon = event.payload as Beacon;
        let fakts = await introspectUrl(beacon.url, 4000);
        setEndpoints((endpoints) => [...endpoints, fakts]);
      } catch (e) {
        console.error("Failed to introspect url", e);
      }
    });
  };

  useEffect(() => {
    let x = subscribe();
    return () => {
      x.then((x) => x());
    };
  }, []);

  return <></>;
};
