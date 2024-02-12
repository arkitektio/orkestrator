import { useFakts } from "@jhnnsrs/fakts";
import { open } from "@tauri-apps/api/shell";
import { useCallback } from "react";
import { MateFinder } from "../types";

export const useOpenDashboard = (item: {dashboardLink?: string}): MateFinder => {
  const { fakts } = useFakts();

  return useCallback(async (options) => {
    if (options.justSelf) {
      return [
        {
          action: async (event) => {
            let link = fakts?.kluster?.gateway_url + item.dashboardLink;
            console.log("Opening dashboard", link);
            if (window.__TAURI__) {
              open(link);
              return;
            }

            window.open(link, '_blank');
          },
          label: "Open Dashboard",
          description: "Opens the Dashboard in a new tab",
        },
      ];
    }

    return [];
  }, [fakts, item]);
};