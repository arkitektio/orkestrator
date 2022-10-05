import { invoke } from "@tauri-apps/api";
import React from "react";
import { useFakts } from "fakts";
import { HerreProvider } from "herre";

export type FaktsHerreProps = {
  children?: React.ReactNode;
};

export const FaktsHerreProvider: React.FC<FaktsHerreProps> = (props) => {
  const { fakts } = useFakts();

  const doRedirect = (url: string) => {
    console.log("Redirecting to", url);
    if (window.__TAURI__) {
      invoke("login", { url: url });
    } else {
      window.location.replace(url);
    }
  };

  if (!fakts || !fakts.herre)
    return (
      <>
        Error! No sufficient fakts provided. Wrap this in FaktsGuard to avoid
        this
      </>
    );

  return (
    <HerreProvider doRedirect={doRedirect}>{props.children}</HerreProvider>
  );
};
