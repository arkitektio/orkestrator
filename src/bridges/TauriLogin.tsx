import { invoke } from "@tauri-apps/api";
import CancelablePromise from "cancelable-promise";
import { useHerre } from "@jhnnsrs/herre";
import React, { useState } from "react";
import { useFakts } from "@jhnnsrs/fakts";

export const TauriLogin: React.FC<{}> = (props) => {
  const { fakts, setFakts } = useFakts();

  const { login, logout, isAuthenticating, token } = useHerre();
  const [loginFuture, setLoginFuture] = useState<
    CancelablePromise<void> | undefined
  >();

  const tauri_login = () => {
    return new CancelablePromise(async (resolve, reject, onCancel) => {
      onCancel(() => {
        console.log("Canceling login");

        invoke("oauth_cancel", { config: { ports: [7890] } }).then(() => {
          console.log("Stopped server");
        });
      });

      try {
        let port = await invoke("oauth_start", { config: { ports: [7890] } });
        console.log("Server started on port", port);

        await login(
          {
            clientId: fakts.lok.client_id,
            clientSecret: fakts.lok.client_secret,
            scopes: fakts.lok.scopes,
            redirectUri: `http://localhost:${port}`,
          },
          {
            base_url: fakts.lok.base_url,
            tokenUrl: fakts.lok.base_url + "/token/",
            userInfoEndpoint: fakts.lok.base_url + "/userinfo/",
            authUrl: fakts.lok.base_url + "/authorize/",
          }
        );
      } catch (err) {
        console.error("oauth error", err);
      }
    });
  };

  return (
    <>
      {token ? (
        <button onClick={() => logout()}>Logout</button>
      ) : (
        <>
          {loginFuture ? (
            <button
              onClick={() => {
                loginFuture.cancel();
                setLoginFuture(undefined);
              }}
            >
              {" "}
              Cancel login{" "}
            </button>
          ) : (
            <button
              onClick={() =>
                setLoginFuture(
                  tauri_login().then(() => {
                    setLoginFuture(undefined);
                  })
                )
              }
            >
              {isAuthenticating ? "Logging in..." : "Login"}
            </button>
          )}
        </>
      )}
    </>
  );
};
