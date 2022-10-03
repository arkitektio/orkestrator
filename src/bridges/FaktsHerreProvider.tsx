import { invoke } from "@tauri-apps/api";
import React from "react";
import { useFakts } from "../fakts";
import { HerreProvider } from "../herre/HerreProvider";

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
    <HerreProvider
      clientId={fakts.herre.client_id}
      clientSecret={fakts.herre.client_secret}
      redirectUri={
        window.__TAURI__
          ? "http://localhost:3030"
          : window.location.origin + "/callback"
      }
      tokenUrl={fakts.herre.base_url + "/token/"}
      userInfoUrl={fakts.herre.base_url + "/userinfo/"}
      authUrl={fakts.herre.base_url + "/authorize/"}
      scopes={fakts.herre.scopes}
      doRedirect={doRedirect}
    >
      {props.children}
    </HerreProvider>
  );
};
