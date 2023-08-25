import React, { useContext, useEffect } from "react";

export type BaseAction = {
  extension?: string;
  description?: string;
  label: string;
  key: string;
  icon?: string;
  disabled?: boolean;
  custom?: (action: BaseAction) => Promise<SetCommandState>;
  params?: { [key: string]: any };
};

export type CommandState = {
  modifiers: Modifier[];
  open: boolean;
  query: string;
};

export type SetCommandState = {
  modifiers?: Modifier[];
  open?: boolean;
  query?: string;
} | void;

export type Modifier<T extends { [key: string]: any } = {}> = {
  key: string;
  label: string;
  params?: T;
};

export type FilterParams = {
  query: string;
  activeModifiers: Modifier[];
};

export type ModifyingAction<T> = BaseAction & {
  handler: "modify";
  params: T;
};

export type Extension = {
  key: string;
  label: string;
  filter: (options: CommandState) => Promise<BaseAction[] | []>;
  do: (action: BaseAction) => Promise<SetCommandState>;
};
export type GeneralMenuContextType = {
  extensions: Extension[];
  actions: BaseAction[];
  modifiers: Modifier[];
  registerExtension: (handler: Extension) => void;
  unregisterExtension: (key: string) => void;
  registerAction: (action: BaseAction) => void;
  unregisterAction: (key: string) => void;
  setModifiers: React.Dispatch<React.SetStateAction<Modifier[]>>;
};

export const GeneralMenuContext = React.createContext<GeneralMenuContextType>({
  extensions: [],
  actions: [],
  modifiers: [],
  registerExtension: () => {},
  unregisterExtension: () => {},
  registerAction: () => {},
  unregisterAction: () => {},
  setModifiers: () => {},
});

export const useGeneralMenu = () => useContext(GeneralMenuContext);

export const useExtension = (extension: Extension) => {
  const { registerExtension, unregisterExtension } = useGeneralMenu();

  useEffect(() => {
    console.log("Registering Extensions ", extension);
    registerExtension(extension);

    return () => unregisterExtension(extension.key);
  }, []);
};

export const useAction = (action: BaseAction) => {
  const { registerAction, unregisterAction } = useGeneralMenu();

  useEffect(() => {
    console.log("Registering action ", action);
    registerAction(action);

    return () => unregisterAction(action.key);
  }, []);
};
