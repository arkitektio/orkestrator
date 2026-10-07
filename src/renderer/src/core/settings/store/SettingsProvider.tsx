import React, { useEffect, useState } from "react";
import { useStore } from "zustand";
import { useFirstStartHardwareProbe } from "../renderer/useFirstStartHardwareProbe";
import { SettingsContext } from "./SettingsContext";
import { createSettingsStore, type SettingsStore } from "./settingsStore";
import { type Settings, defaultSettings as defSett } from "./validator";

export type SettingsProps = {
  children: React.ReactNode;
  defaultSettings?: Settings;
};

/** Inside the provider, so it only runs once the settings have hydrated. */
const FirstStartHardwareProbe = () => {
  useFirstStartHardwareProbe();
  return null;
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
    const stopFollowing = store.followOtherWindows();

    return () => {
      stopFollowing();
      store.cleanup();
    };
  }, [store]);

  if (!settings) {
    return <>Loading settings</>;
  }

  return (
    <SettingsContext.Provider value={store}>
      <FirstStartHardwareProbe />
      {children}
    </SettingsContext.Provider>
  );
};
