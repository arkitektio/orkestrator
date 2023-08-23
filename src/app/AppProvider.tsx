import { DatalayerProvider } from "@jhnnsrs/datalayer";
import { FaktsProvider } from "@jhnnsrs/fakts";
import { HerreProvider, windowRedirect } from "@jhnnsrs/herre";
import { listen } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/api/shell";
import React from "react";
import { FlussProvider } from "../fluss/fluss-provider";
import { LokProvider } from "../lok/LokProvider";
import { MikroProvider } from "../mikro/MikroProvider";
import { MikroNextProvider } from "../mikro_next/MikroNextProvider";
import { PortProvider } from "../port/PortProvider";
import { RekuestProvider } from "../rekuest";
import { AgentProvider } from "../rekuest/agent/AgentProvider";
import { PostmanProvider } from "../rekuest/providers/postman/postman-provider";
import { RequesterProvider } from "../rekuest/providers/requester/requester-provider";
import { ReserverProvider } from "../rekuest/providers/reserver/reserver-provider";
import { WidgetRegistryProvider } from "../rekuest/widgets/widget-provider";

const doRedirect = async (url: string, abortController: AbortController) => {
  console.log("Redirecting to", url);
  if (window.__TAURI__) {
    console.log("Tauri detected");
    open(url);

    return new Promise<string>((resolve, reject) => {
      console.log("Listening for code");
      const unlisten = listen("oauth://url", async (event) => {
        let url = event.payload as string;
        let code = url.split("code=")[1];
        console.log("Got code", code);
        resolve(code);
      });

      const unlistend = listen("oauth://invalid-url", async (event) => {
        console.log("Got invalid-rl", event);
        reject(event);
      });
    });
  } else {
    return await windowRedirect(url, abortController);
  }
};

//TODO: Mater provider needs to be seperate
export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <FaktsProvider>
      <HerreProvider doRedirect={doRedirect}>
        <RekuestProvider>
          <WidgetRegistryProvider>
            <PostmanProvider>
              <ReserverProvider>
                <RequesterProvider>
                  <AgentProvider>
                    <LokProvider>
                      <DatalayerProvider>
                        <FlussProvider>
                          <PortProvider>
                            <MikroNextProvider>
                              <MikroProvider>{children}</MikroProvider>
                            </MikroNextProvider>
                          </PortProvider>
                        </FlussProvider>
                      </DatalayerProvider>
                    </LokProvider>
                  </AgentProvider>
                </RequesterProvider>
              </ReserverProvider>
            </PostmanProvider>
          </WidgetRegistryProvider>
        </RekuestProvider>
      </HerreProvider>
    </FaktsProvider>
  );
};
