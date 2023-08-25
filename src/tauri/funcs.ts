import { Beacon, FaktsEndpoint, introspectUrl } from "@jhnnsrs/fakts";
import { listen, once } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/api/shell";
import { Observable } from "rxjs";

export const tauriRedirect = (
  url: string,
  abortController: AbortController
) => {
  console.log("Tauri detected");
  open(url);

  return new Promise<string>(async (resolve, reject) => {
    console.log("Listening for code");
    const once_listen = await once("oauth://url", async (event) => {
      let url = event.payload as string;
      let code = url.split("code=")[1];
      console.log("Got code", code);
      resolve(code);
    });

    const two_listen = await once("oauth://invalid-url", async (event) => {
      console.log("Got invalid-rl", event);
      reject(event);
    });

    abortController.signal.addEventListener("abort", () => {
      once_listen();
      two_listen();
    });
  });
};

export const tauriStreamEndpoints = () => {
  return new Observable<FaktsEndpoint>((subscriber) => {
    // Keep track of the interval resource

    let x = listen("fakts", async (event) => {
      try {
        let beacon = event.payload as Beacon;
        let fakts = await introspectUrl(beacon.url, 4000);
        subscriber.next(fakts);
      } catch (e) {
        console.error("Failed to introspect url", e);
      }
    });

    // Provide a way of canceling and disposing the interval resource
    return function unsubscribe() {
      x.then((unlisten) => unlisten());
    };
  });
};
