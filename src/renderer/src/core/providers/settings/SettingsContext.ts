import { createScopedStoreHooks } from "@/core/lib/generic/createScopedStore";
import { defaultSettings, Settings } from "./validator";
import type { SettingsStoreState } from "./settingsStore";

export type SettingsContextType = {
  settings: Settings;
  setSettings: (settings: Settings) => void;
};

const {
  StoreContext: SettingsStoreContext,
  useScopedStore: useSettingsStore,
  useStoreApi: useSettingsStoreApi,
} = createScopedStoreHooks<SettingsStoreState>("SettingsStore");

export const SettingsContext = SettingsStoreContext;

export { useSettingsStore, useSettingsStoreApi };

export const useSettings = (): SettingsContextType => {
  const settings = useSettingsStore((state) => state.settings) ?? defaultSettings;
  const setSettings = useSettingsStore((state) => state.setSettings);

  return {
    settings,
    setSettings,
  };
};
