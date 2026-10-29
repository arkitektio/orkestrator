// Constants used in the app

import { Manifest } from "@/core/connection/arkitekt/fakts/manifestSchema";

declare global {
  interface Window {
    __ORKESTRATOR_BASE_NAME__: string;
  }
}


export const baseName = window.electron ? "" : "orkestrator";

export const DEFAULT_COORDINATION_SERVER_HOST = "go.arkitekt.live";
export const DEFAULT_COORDINATION_SERVER_URL =
  `https://${DEFAULT_COORDINATION_SERVER_HOST}`;

/**
 * What Orkestrator asks to be allowed to do: everything, at lok and at every service.
 *
 * Each service declares one scope that grants all it offers (`<service>_all`); lok grants
 * the ones the organization has and skips the rest, so this list works on any hub.
 * Narrow it to what the UI actually calls once its clients say what they need.
 */
export const ALL_SCOPES = [
  "openid",
  "lok_all",
  "alpaka_all",
  "bank_all",
  "dokuments_all",
  "elektro_all",
  "fluss_all",
  "kabinet_all",
  "kraph_all",
  "kuvert_all",
  "lokate_all",
  "lovekit_all",
  "mikro_all",
  "omero_ark_all",
  "rekuest_all",
];

export const manifest: Manifest = {
  version: "0.0.1",
  identifier: "live.arkitekt.orkestrator",
  scopes: ALL_SCOPES,
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
      key: "s3",
      service: "live.arkitekt.s3",
      optional: false,
    },
    {
      key: "livekit",
      service: "io.livekit.livekit",
      // The media server behind lovekit's calls; a deployment without one
      // still boots, it just has no calls (`app/Arkitekt.tsx` agrees).
      optional: true,
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
