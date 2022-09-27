import React, { useState } from "react";
import {
  BaseAction,
  Extension,
  GeneralMenuContext,
  Modifier,
} from "./GeneralMenuContext";

export interface GenerarMenuProviderProps {
  children: React.ReactNode;
}

export const GeneralMenuProvider: React.FC<GenerarMenuProviderProps> = (
  props
) => {
  const [handlers, setHandlers] = useState<Extension[]>([]);
  const [actions, setActions] = useState<BaseAction[]>([]);
  const [modifiers, setModifiers] = useState<Modifier[]>([]);

  const registerHandler = (handler: Extension) => {
    setHandlers((handlers) => [handler, ...handlers]);
  };
  const unregisterHandler = (key: string) => {
    setHandlers((handlers) =>
      handlers.filter((handler) => handler.key !== key)
    );
  };

  const registerAction = (action: BaseAction) => {
    setActions((actions) => [action, ...actions]);
  };
  const unregisterAction = (key: string) => {
    setActions((actions) => actions.filter((action) => action.key !== key));
  };

  return (
    <GeneralMenuContext.Provider
      value={{
        actions,
        extensions: handlers,
        modifiers,
        registerExtension: registerHandler,
        unregisterExtension: unregisterHandler,
        registerAction,
        unregisterAction,
        setModifiers,
      }}
    >
      {props.children}
    </GeneralMenuContext.Provider>
  );
};
