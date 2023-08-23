import React from "react";
import { HTML5Backend } from "react-dnd-html5-backend";

import { DndProvider, MouseTransition } from "react-dnd-multi-backend";
import { QueryParamProvider } from "use-query-params";
import { ReactRouter6Adapter } from "use-query-params/adapters/react-router-6";
import { GeneralMenuProvider } from "../components/command/GeneralMenuProvider";
import { DialogProvider } from "../layout/dialog/DialogProvider";
import { SelectionProvider } from "../rekuest/selection/provider";
import { SettingsProvider } from "../settings/settings-provider";

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
export const OrkestratorProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return (
    <QueryParamProvider adapter={ReactRouter6Adapter}>
      <DndProvider options={HTML5toTouch}>
        <GeneralMenuProvider>
          <SettingsProvider>
            <SelectionProvider>
              <DialogProvider>{children}</DialogProvider>
            </SelectionProvider>
          </SettingsProvider>
        </GeneralMenuProvider>
      </DndProvider>
    </QueryParamProvider>
  );
};
