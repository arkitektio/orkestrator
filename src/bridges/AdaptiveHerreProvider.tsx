import { invoke } from "@tauri-apps/api/tauri";
import { open } from "@tauri-apps/api/shell";
import React from "react";
import { useFakts } from "@jhnnsrs/fakts";
import { HerreProvider } from "@jhnnsrs/herre";
import { AdaptiveFaktsFallback } from "./AdaptiveFallback";

export type FaktsHerreProps = {
  children?: React.ReactNode;
};

export const AdaptiveHerreProvider: React.FC<FaktsHerreProps> = (props) => {
  const doRedirect = (url: string) => {
    console.log("Redirecting to", url);
    if (window.__TAURI__) {
      open(url);
    } else {
      window.open(url, "_blank", "noreferrer, popup");
    }
  };

  return (
    <HerreProvider doRedirect={doRedirect}>{props.children}</HerreProvider>
  );
};
