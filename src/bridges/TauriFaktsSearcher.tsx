import { FaktsEndpoint, introspectUrl, useLoadFakts } from "@jhnnsrs/fakts";
import { invoke } from "@tauri-apps/api";
import React, { useEffect } from "react";

export interface CallbackProps {}

export interface ConfigValues {
  host: string;
}

export type Beacon = {
  url: string;
}

export const TauriFaktsSearcher: React.FC<CallbackProps> = (props) => {
  const { registerEndpoints} = useLoadFakts();
  const [future, setFuture] = React.useState<Promise<any> | null>(null);
  const [scan, setScan] = React.useState(true)




  useEffect(() => {
    if (future || !scan) return;
    setFuture(invoke("fakts_start").then( async (res) => {
      let endpoints: FaktsEndpoint[] = [];
      console.log(res)

      for (let beacon of (res as Beacon[])) {
        try {
          let introspected = await introspectUrl(beacon.url, 1000, new AbortController());
          endpoints.push(introspected);
        } catch (e) {
          console.error(e);
        }
      }
      registerEndpoints(endpoints);
      setFuture(null);
    }));
  }, [future, scan]);



  return <div className="text-gray-300 animate-pulse" onClick={() => setScan(!scan)}> Network {future && "Searching Fakts for you locally"}</div>;
};
