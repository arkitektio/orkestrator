import { useFakts } from "@jhnnsrs/fakts";
import { useHerre } from "@jhnnsrs/herre";
import { invoke } from "@tauri-apps/api";
import CancelablePromise from "cancelable-promise";
import { useState } from "react";

export const LoginButton: React.FC<{}> = (props) => {
  const { fakts } = useFakts();
  const [future, setFuture] = useState<CancelablePromise | null>(null);
  const { login } = useHerre();

  const adaptive_login = () => {
    return new CancelablePromise(async (resolve, reject, onCancel) => {
      try {
        let redirect_uri: string;
        if (window.__TAURI__) {
          let port = await invoke("oauth_start", { config: { ports: [7890, 4567, 7888, 8345, 2389, 5839, 6895, 23893, 2349, 23939] } });
          console.log("Server started on port", port);
          redirect_uri = `http://127.0.0.1:${port}/`;
        } else {
          redirect_uri = window.location.origin + "/callback";
        }

        onCancel(async () => {
          console.log("Canceling login");

          fetch(redirect_uri + "/exit");
          setFuture(null);
        });

        await login(
          {
            clientId: fakts.lok.client_id,
            clientSecret: fakts.lok.client_secret,
            scopes: fakts.lok.scopes,
            redirectUri: redirect_uri,
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
      {future ? (
        <button
          type="button"
          onClick={() => future.cancel()}
          className="w-full shadow-lg shadow-primary-300/60 flex items-center justify-center px-8 py-3 border text-base font-medium rounded-md dark:text-white text-back-700 border-primary-400 bg-primary-300 hover:bg-primary-400 md:py-4 md:text-lg md:px-10"
        >
          Cancel Login
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setFuture(adaptive_login())}
          className="w-full shadow-lg shadow-primary-300/60 flex items-center justify-center px-8 py-3 border text-base font-medium rounded-md dark:text-white text-back-700 border-primary-400 bg-primary-300 hover:bg-primary-400 md:py-4 md:text-lg md:px-10"
        >
          Login with {fakts.self.name}
        </button>
      )}
    </>
  );
};
