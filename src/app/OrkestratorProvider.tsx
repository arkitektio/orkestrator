import React from "react";
import { HTML5Backend } from "react-dnd-html5-backend";

import { DndProvider, MouseTransition } from "react-dnd-multi-backend";
import { QueryParamProvider } from "use-query-params";
import { ReactRouter6Adapter } from "use-query-params/adapters/react-router-6";
import { GeneralMenuProvider } from "../providers/command/GeneralMenuProvider";
import { ConfirmerProvider } from "../providers/confirmer/confirmer-provider";
import { DialogProvider } from "../providers/dialog/DialogProvider";
import { SelectionProvider } from "../rekuest/selection/provider";
import { SettingsProvider } from "../settings/settings-provider";

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
          <ConfirmerProvider>
            <GeneralMenuProvider>
              <SettingsProvider>
                <SelectionProvider>
                  <DialogProvider>{children}</DialogProvider>
                </SelectionProvider>
              </SettingsProvider>
            </GeneralMenuProvider>
          </ConfirmerProvider>
      </DndProvider>
    </QueryParamProvider>
  );
};
