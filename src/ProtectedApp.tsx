import { HerreGuard } from "@jhnnsrs/herre";
import React, { CSSProperties } from "react";
import { HTML5Backend } from "react-dnd-html5-backend";
import { Outlet } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { MikroDoer } from "./bridges/MikroDoer";
import { GeneralMenu } from "./components/command/GeneralMenu";
import { GeneralMenuProvider } from "./components/command/GeneralMenuProvider";
import { NavigationActions } from "./components/command/NavigationActions";
import { NodesExtension } from "./components/command/NodesExtension";
import { SearchActions } from "./components/command/SearchActions";
import { SelectionActions } from "./components/command/SelectionActions";
import { NavigationBar } from "./components/navigation/NavigationBar";
import { FlussProvider } from "./fluss/fluss-provider";
import { FlussGuard } from "./fluss/guard";
import { FlussWard } from "./fluss/ward";
import "./index.css";
import { ManGuard } from "./lok/guard";
import { ManProvider } from "./lok/provider";
import { MentionListener } from "./mikro/listeners/MentionListener";
import { MikroGuard } from "./mikro/MikroGuard";
import { MikroProvider } from "./mikro/MikroProvider";
import "./popping.css";
import { AgentProvider } from "./rekuest/agent/AgentProvider";
import { PostmanProvider } from "./rekuest/postman/graphql/postman-provider";
import { RekuestProvider } from "./rekuest/RekuestProvider";
import { SelectionProvider } from "./rekuest/selection/provider";
import { WidgetRegistryProvider } from "./rekuest/widgets/widget-provider";

import { DndProvider, MouseTransition, Preview } from "react-dnd-multi-backend";
import { ReserverProvider } from "./rekuest/postman/reserver/reserver-provider";
import { SettingsProvider } from "./settings/settings-provider";

import { PublicLogin } from "./pages/public/PublicLogin";
import { MaterProvider } from "./rekuest/postman/mater/mater-provider";
import { RequesterProvider } from "./rekuest/postman/requester/requester-provider";
import { RekuestGuard } from "./rekuest/RekuestGuard";
import { MikroAutoConfigure } from "./bridges/MikroAutoConfigure";
import { MikroWard } from "./bridges/MikroWard";
import { PortAutoConfigure } from "./bridges/PortAutoConfigure";
import { PortProvider } from "./port/PortProvider";
import { PortGuard } from "./port/PortGuard";
import { DialogProvider } from "./layout/dialog/DialogProvider";
import { CreateRepoDialog } from "./port/components/dialogs/CreateRepoDialog";
import { XArrayProvider } from "./experimental/provider/provider";
import { RekuestAutoConfigure } from "./bridges/RekuestAutoConfigure";
import { FaktsGuard } from "@jhnnsrs/fakts";
import { FlussAutoConfigure } from "./bridges/FlussAutoConfigure";
import { LokAutoConfigure } from "./bridges/LokAutoConfigure";
import { DatalayerProvider } from "./datalayer/provider";
import { DatalayerAutoConfigure } from "./bridges/DatalayerAutoConfigure";

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
      <RekuestProvider>
        <RekuestAutoConfigure />
        <WidgetRegistryProvider>
          <ManProvider>
            <LokAutoConfigure />
            <ManGuard>
              <DatalayerProvider>
                <FlussProvider>
                  <FlussAutoConfigure />
                  <FlussWard>
                    <PortProvider>
                      <PortAutoConfigure />
                      <MikroProvider>
                        <MikroAutoConfigure />

                        <DatalayerAutoConfigure />
                        <SettingsProvider>
                          <MikroWard>
                            <GeneralMenuProvider>
                              <PostmanProvider>
                                <ReserverProvider>
                                  <RequesterProvider>
                                    <MaterProvider>
                                      <AgentProvider>
                                        <XArrayProvider>
                                          <RekuestGuard>
                                            <MikroDoer />
                                          </RekuestGuard>

                                          <DndProvider options={HTML5toTouch}>
                                            <SelectionProvider>
                                              <DialogProvider
                                                registeredDialogs={{
                                                  create: CreateRepoDialog,
                                                }}
                                              >
                                                <ToastContainer
                                                  position="bottom-right"
                                                  theme="dark"
                                                />
                                                <ComponentPreview
                                                  text={"sdfsdf"}
                                                />
                                                <GeneralMenu />
                                                <NavigationActions />
                                                <MikroGuard>
                                                  <SearchActions />
                                                </MikroGuard>

                                                <RekuestGuard>
                                                  <NodesExtension />
                                                </RekuestGuard>
                                                <SelectionActions />
                                                <MikroGuard>
                                                  <MentionListener />
                                                </MikroGuard>

                                                <div className="flex flex-col h-screen sm:flex-row-reverse">
                                                  <div className="flex-grow flex bg-gray-300 dark:bg-slate-900 overflow-y-auto">
                                                    <React.Suspense
                                                      fallback={<>Loading</>}
                                                    >
                                                      <Outlet />
                                                    </React.Suspense>{" "}
                                                  </div>
                                                  <div className="flex-initial sm:flex-initial sm:static sm:w-20">
                                                    <NavigationBar />
                                                  </div>
                                                </div>
                                              </DialogProvider>
                                            </SelectionProvider>
                                          </DndProvider>
                                        </XArrayProvider>
                                      </AgentProvider>
                                    </MaterProvider>
                                  </RequesterProvider>
                                </ReserverProvider>
                              </PostmanProvider>
                            </GeneralMenuProvider>
                          </MikroWard>
                        </SettingsProvider>
                      </MikroProvider>
                    </PortProvider>
                  </FlussWard>
                </FlussProvider>
              </DatalayerProvider>
            </ManGuard>
          </ManProvider>
        </WidgetRegistryProvider>
      </RekuestProvider>
    </HerreGuard>
  );
};
