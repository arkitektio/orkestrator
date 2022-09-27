import React, { useContext } from "react";
import { WidgetRegistry } from "./registry";

export type Ward = (...args: any[]) => Promise<any | undefined>;

export type WidgetRegistryContextType = {
  registry?: WidgetRegistry;
};

export const WidgetRegistryContext =
  React.createContext<WidgetRegistryContextType>({});

export const useWidgetRegistry = () => useContext(WidgetRegistryContext);
