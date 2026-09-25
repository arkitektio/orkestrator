// Constants used in the app

import { Manifest } from "@/lib/arkitekt/fakts/manifestSchema";

declare global {
  interface Window {
    __ORKESTRATOR_BASE_NAME__: string;
  }
}


export const baseName = window.electron ? "" : "orkestrator";

export const DEFAULT_COORDINATION_SERVER_HOST = "go.arkitekt.live";
export const DEFAULT_COORDINATION_SERVER_URL =
  `https://${DEFAULT_COORDINATION_SERVER_HOST}`;

export const manifest: Manifest = {
  version: "0.0.1",
  identifier: "live.arkitekt.orkestrator",
  scopes: ["openid"],
  requirements: [
    {
      key: "lok",
      service: "live.arkitekt.lok",
    },
    {
      key: "rekuest",
      service: "live.arkitekt.rekuest",
      optional: false,
    },
    {
      key: "mikro",
      service: "live.arkitekt.mikro",
      optional: false,
    },
    {
      key: "fluss",
      service: "live.arkitekt.fluss",
      optional: false,
    },
    {
      key: "kabinet",
      service: "live.arkitekt.kabinet",
      optional: true,
    },
    {
      key: "datalayer",
      service: "live.arkitekt.datalayer",
      optional: false,
    },
    {
      key: "livekit",
      service: "io.livekit.livekit",
      optional: false,
    },
    {
      key: "omero_ark",
      service: "live.arkitekt.omero_ark",
      optional: true,
    },
  ],
};

// The kind of a smart model drag, as the dnd engine (lib/dnd) names it
export const SMART_MODEL_DROP_TYPE = "smart";

// Which endpoints should be used to discover the fakts services
export const WELL_KNOWN_ENDPOINTS = ["https://localhost:443"];

export const KABINET_REFRESH_POD_HASH =
  "3edf4d37e009b4273ffaf1fa1dc5316ded2363c6beb08e73a614055a22062b04";

export const KABINET_INSTALL_POD_HASH =
  "8580383544036374f291b20fea59bab3ddaa9a30d952fb3e451e621e96fd233c";

export const KABINET_INSTALL_DEFINITION_HASH =
  "c73166761996596ea36f8bcccc4e09c6954e6134d22bfab6c117df62e8bcdaff";

export const NO_RECONNECT_CODES = [4003];
