import { useLoadFakts } from "@jhnnsrs/fakts";
import { invoke } from "@tauri-apps/api";
import React, { useEffect } from "react";

export interface CallbackProps {}

export interface ConfigValues {
  host: string;
}

export const TauriFaktsSearcher: React.FC<CallbackProps> = (props) => {
  const { registerEndpoints} = useLoadFakts();
  const [future, setFuture] = React.useState<Promise<any> | null>(null);
  const [scan, setScan] = React.useState(true)


  useEffect(() => {
    if (future || !scan) return;
    setFuture(invoke("fakts_start").then((res) => {
      console.log("Started Fakts", res);
      registerEndpoints(res);
      setFuture(null);
    }));
  }, [future, scan]);



  return <div className="text-gray-300 animate-pulse" onClick={() => setScan(!scan)}> Network {future && "Searching Fakts for you locally"}</div>;
};
