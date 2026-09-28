import React, { useContext } from "react";
import { WidgetRegistryType } from "./types";

export type Ward = (...args: any[]) => Promise<any | undefined>;

export type WidgetRegistryContextType = {
  registry: WidgetRegistryType;
  setRegistry: (postman: WidgetRegistryType) => void;
};

export const WidgetRegistryContext =
  React.createContext<WidgetRegistryContextType>({
    registry: null as unknown as WidgetRegistryType,
    setRegistry: () => {
      throw new Error(
        "Set registry is not implemented. Do you have a Registry provider?",
      );
    },
  });

export const useWidgetRegistry = () => {
  const { registry, setRegistry } = useContext(WidgetRegistryContext);
  if (!registry) {
    throw new Error(
      "WidgetRegistryContext is not set. Did you forget to wrap your component in a WidgetRegistryProvider?",
    );
  }

  return {
    registry,
    setRegistry,
  };
};
