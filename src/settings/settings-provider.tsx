import React, { useEffect, useState } from "react";
import { useFakts } from "@jhnnsrs/fakts";
import { Settings, SettingsContext } from "./settings-context";
import * as yup from "yup";

export type SettingsProps = {
  children: React.ReactNode;
  defaultSettings?: Settings;
};

const settingsValidator = yup.object().shape({
  autoResolve: yup.boolean().required(),
  allowAutoRequest: yup.boolean().required(),
  allowBatch: yup.boolean().required(),
  darkMode: yup.boolean().required(),
  colorScheme: yup.string().required(),
  experimental: yup.boolean().required(),
});

export const SettingsProvider: React.FC<SettingsProps> = ({
  children,
  defaultSettings = {
    autoResolve: true,
    allowAutoRequest: true,
    allowBatch: true,
    darkMode: true,
    colorScheme: "red",
    experimental: false,
  },
}) => {
  const [settings, setSettings] = useState<Settings | undefined>(undefined);
  const { fakts } = useFakts();

  useEffect(() => {
    // save settings to local storage
    console.log("Saving settings", settings);
    if (settings) {
      localStorage.setItem("wasser-settings", JSON.stringify(settings));
      console.log("Settings saved to local storage");
    }
  }, [settings]);

  useEffect(() => {
    if (settings?.darkMode) {
      localStorage.setItem("theme", "dark");
      document.documentElement.classList.add("dark");
      document.documentElement.classList.add("theme-back-bright");
      document.documentElement.classList.remove("theme-back-zink");
    }
    if (!settings?.darkMode) {
      localStorage.setItem("theme", "light");
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.remove("theme-back-bright");
      document.documentElement.classList.add("theme-back-zink");
    }
  }, [settings?.darkMode]);

  useEffect(() => {
    if (settings?.colorScheme) {
      document.documentElement.classList.remove(
        "theme-green",
        "theme-blue",
        "theme-red"
      );
      document.documentElement.classList.add(`theme-${settings.colorScheme}`);
    }
  }, [settings?.colorScheme]);

  useEffect(() => {
    // load settings from local storage
    const loadValidateSettings = async () => {
      let localSettings;
      try {
        let l = localStorage.getItem("wasser-settings");
        console.log("Loaded Settings", l);
        if (l) {
          localSettings = await settingsValidator.validate(JSON.parse(l));
          console.log("Settings loaded from local storage");
        }
      } catch (e) {
        console.error(e);
        localSettings = undefined;
      }

      if (localSettings) {
        setSettings(localSettings as Settings);
      } else {
        console.log("Could not load settings from local storage");
        // settings the defaults if no settings are found in local storage
        if (fakts.wasser) {
          setSettings(fakts.wasser);
        } else {
          setSettings(defaultSettings);
        }
      }
    };

    loadValidateSettings();
  }, [fakts]);

  if (!settings) {
    return <>Loading settings</>;
  }

  return (
    <SettingsContext.Provider
      value={{
        settings: settings,
        setSettings: setSettings,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};
