import { useFakts } from "@jhnnsrs/fakts";
import { open } from "@tauri-apps/api/shell";
import { useCallback } from "react";
import { Mate, MateFinder } from "../types";

export const useOpenInOmeroMate = (): ((
  url: string
) => MateFinder) => {
  const { fakts } = useFakts();

  return useCallback((url) => async (options) => {
    let mates: Mate[] = [];
    if (!options.partnersIncludeSelf) {
      return mates;
    }

    mates.push({
      action: async () => {
        console.log(fakts)
        let openurl = `http://${fakts?.omero_web?.host}:${fakts?.omero_web?.port}/${url}`;
        console.log("Opening in Omero Web: ", openurl);
        if (window.__TAURI__) {
          open(openurl);
          return;
        }

        window.open(openurl, "_blank");
      },
      label: "Open In Omero Web",
    });

    return mates;
  }, [fakts]);
};
