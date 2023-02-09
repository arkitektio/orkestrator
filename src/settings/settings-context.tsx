import { ApolloClient, NormalizedCacheObject, useQuery } from "@apollo/client";
import React, { useContext } from "react";
import { boolean } from "yup";

export type Settings = {
  autoResolve: boolean;
  allowAutoRequest: boolean;
  darkMode: boolean;
  colorScheme: "red" | "green" | "blue";
  allowBatch: boolean;
  experimental: boolean;
};

export type SettingsContextType = {
  settings: Settings;
  setSettings: React.Dispatch<React.SetStateAction<Settings | undefined>>;
};

export const SettingsContext = React.createContext<SettingsContextType>({
  settings: {
    autoResolve: true,
    allowAutoRequest: true,
    allowBatch: true,
    darkMode: true,
    colorScheme: "red",
    experimental: false,
  },
  setSettings: () => {},
});

export const useSettings = () => useContext(SettingsContext);
