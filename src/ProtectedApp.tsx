import React, { CSSProperties } from "react";
import { HTML5Backend } from "react-dnd-html5-backend";
import { Outlet } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { AgentProvider } from "./arkitekt/agent/agent-provider";
import { ArkitektProvider } from "./arkitekt/arkitekt-provider";
import { PostmanProvider } from "./arkitekt/postman/graphql/postman-provider";
import { SelectionProvider } from "./arkitekt/selection/provider";
import { WidgetRegistryProvider } from "./arkitekt/widgets/widget-provider";
import { AlerterProvider } from "./components/alerter/alerter-provider";
import { GeneralMenu } from "./components/command/GeneralMenu";
import { GeneralMenuProvider } from "./components/command/GeneralMenuProvider";
import { NavigationActions } from "./components/command/NavigationActions";
import { NodesExtension } from "./components/command/NodesExtension";
import { SearchActions } from "./components/command/SearchActions";
import { SelectionActions } from "./components/command/SelectionActions";
import { ConfirmerProvider } from "./components/confirmer/confirmer-provider";
import { NavigationBar } from "./components/navigation/NavigationBar";
import { FlussProvider } from "./fluss/fluss-provider";
import { FlussGuard } from "./fluss/guard";
import { FlussWard } from "./fluss/ward";
import { HerreGuard } from "./herre/herre-guard";
import "./index.css";
import { ManGuard } from "./man/guard";
import { ManProvider } from "./man/provider";
import { MikroDoer } from "./mikro/doer";
import { MentionListener } from "./mikro/listeners/MentionListener";
import { MikroGuard } from "./mikro/mikro-guard";
import { MikroProvider } from "./mikro/mikro-provider";
import { MikroWard } from "./mikro/ward";
import "./popping.css";
import { PortGuard } from "./port/port-guard";
import { PortProvider } from "./port/port-provider";

import { DndProvider, MouseTransition, Preview } from "react-dnd-multi-backend";
import { ReserverProvider } from "./arkitekt/postman/reserver/reserver-provider";
import { SettingsProvider } from "./settings/settings-provider";

import { MaterProvider } from "./arkitekt/postman/mater/mater-provider";
import { RequesterProvider } from "./arkitekt/postman/requester/requester-provider";
import { PublicHome } from "./pages/public/PublicHome";
import { PublicLogin } from "./pages/public/PublicLogin";

/* try {
  import("virtual:pwa-register")
    .then((y) => {
      const updateSW = y.registerSW({
        onNeedRefresh() {
          updateSW();
        },
        onOfflineReady() {
          console.log("offline ready");
        },
      });
    })
    .catch((e) => {
      console.log(e);
    })
    .finally(() => {
      console.log("finally");
    });
} catch (e) {
  console.log("no service worker");
} */

export const HTML5toTouch = {
  backends: [
    {
      id: "html5",
      backend: HTML5Backend,
      preview: true,
      transition: MouseTransition,
    },
  ],
};
interface Props {}

const Block = ({
  row,
  item,
  style,
}: {
  row: number;
  item: any;
  style: CSSProperties;
}): JSX.Element => {
  return (
    <div className="bg-primary-300 rounded-sm">{JSON.stringify(item)}</div>
  );
};

const ComponentPreview = ({ text }: { text: string }): JSX.Element => {
  return (
    <Preview
      generator={({ item, style }): JSX.Element => {
        return (
          <div
            className="bg-primary-300 rounded-full px-1  text-white text-xs"
            style={{ ...style, top: 0, left: "45px" }}
          ></div>
        );
      }}
    />
  );
};

export const ProtectedApp: React.FC<Props> = () => {
  return (
    <HerreGuard fallback={<PublicLogin />}>
      <ArkitektProvider>
        <WidgetRegistryProvider>
          <ManProvider>
            <ManGuard>
              <FlussProvider>
                <FlussGuard>
                  <FlussWard>
                    <PortProvider>
                      <PortGuard>
                        <MikroProvider>
                          <SettingsProvider>
                            <MikroGuard>
                              <MikroWard>
                                <ConfirmerProvider>
                                  <AlerterProvider>
                                    <GeneralMenuProvider>
                                      <PostmanProvider>
                                        <ReserverProvider>
                                          <RequesterProvider>
                                            <MaterProvider>
                                              <AgentProvider>
                                                <MikroDoer />
                                                <DndProvider
                                                  options={HTML5toTouch}
                                                >
                                                  <SelectionProvider>
                                                    <ToastContainer
                                                      position="bottom-right"
                                                      theme="dark"
                                                    />
                                                    <ComponentPreview
                                                      text={"sdfsdf"}
                                                    />
                                                    <GeneralMenu />
                                                    <NavigationActions />
                                                    <SearchActions />
                                                    <NodesExtension />
                                                    <SelectionActions />
                                                    <MentionListener />
                                                    <div className="flex flex-col h-screen sm:flex-row-reverse">
                                                      <div className="flex-grow flex bg-gray-300 dark:bg-slate-900 overflow-y-auto">
                                                        <Outlet />
                                                      </div>
                                                      <div className="flex-initial sm:flex-initial sm:static sm:w-20">
                                                        <NavigationBar />
                                                      </div>
                                                    </div>
                                                  </SelectionProvider>
                                                </DndProvider>
                                              </AgentProvider>
                                            </MaterProvider>
                                          </RequesterProvider>
                                        </ReserverProvider>
                                      </PostmanProvider>
                                    </GeneralMenuProvider>
                                  </AlerterProvider>
                                </ConfirmerProvider>
                              </MikroWard>
                            </MikroGuard>
                          </SettingsProvider>
                        </MikroProvider>
                      </PortGuard>
                    </PortProvider>
                  </FlussWard>
                </FlussGuard>
              </FlussProvider>
            </ManGuard>
          </ManProvider>
        </WidgetRegistryProvider>
      </ArkitektProvider>
    </HerreGuard>
  );
};
