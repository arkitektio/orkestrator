import React, { useEffect, useState } from "react";
import { useStore } from "zustand";
import { SettingsContext } from "./SettingsContext";
import { createSettingsStore, type SettingsStore } from "./settingsStore";
import { type Settings, defaultSettings as defSett } from "./validator";

export type SettingsProps = {
  children: React.ReactNode;
  defaultSettings?: Settings;
};

export const SettingsProvider: React.FC<SettingsProps> = ({
  children,
  defaultSettings = defSett,
}) => {
  const [store] = useState<SettingsStore>(() =>
    createSettingsStore(defaultSettings),
  );
  const settings = useStore(store, (state) => state.settings);

  useEffect(() => {
    store.getState().setDefaultSettings(defaultSettings);
  }, [defaultSettings, store]);

  useEffect(() => {
    store.getState().hydrate();

    return () => {
      store.cleanup();
    };
  }, [store]);

  if (!settings) {
    return <>Loading settings</>;
  }

  return <SettingsContext.Provider value={store}>{children}</SettingsContext.Provider>;
};
