import { useFakts } from "@jhnnsrs/fakts";
import { MateFinder } from "../types";

export const useOpenDashboard = (item: {dashboardLink?: string}): MateFinder => {
  const { fakts } = useFakts();

  return async (options) => {
    if (options.justSelf) {
      return [
        {
          action: async (event) => {


            
            let link = fakts.kluster.gateway_url + item.dashboardLink;
            console.log("Opening dashboard", link);

            window.open(link, '_blank');
          },
          label: "Open Dashboard",
          description: "Opens the Dashboard in a new tab",
        },
      ];
    }

    return [];
  };
};