import { BRIDGE_SOURCE, CONNECTION_ENV } from "./bridgeScript";
import { zipStored } from "./zip";

/**
 * The server as a Claude desktop extension: an `.mcpb` bundle (a ZIP with a
 * `manifest.json` and the stdio bridge), which the Claude app installs from
 * an "Install" dialog when the file is opened. No config file to edit.
 *
 * Built on this computer for this computer: the manifest tells the bridge
 * where this app keeps `connection.json`. It carries no token, so the file
 * itself is not a secret, but it is of no use anywhere else.
 *
 * Manifest per github.com/anthropics/mcpb MANIFEST.md (spec 0.3). Claude runs
 * a `node` server with the Node it ships with.
 */
export const EXTENSION_FILE = "orkestrator.mcpb";

export type ExtensionInput = {
  version: string;
  /** Absolute path of `connection.json`. */
  connectionPath: string;
  tools: readonly { name: string; description: string }[];
};

export const extensionManifest = ({ version, connectionPath, tools }: ExtensionInput) => ({
  manifest_version: "0.3",
  name: "orkestrator",
  display_name: "Orkestrator (experimental)",
  version,
  description: "See what is open in Orkestrator on this computer: tabs, objects, and a picture of the scene.",
  long_description:
    "Experimental. Talks to the Orkestrator app running on this computer, and only while assistant access is switched on there (Settings → Experiments). It looks and navigates; it cannot run or change anything.",
  author: { name: "Arkitekt" },
  server: {
    type: "node",
    entry_point: "server/index.js",
    mcp_config: {
      command: "node",
      args: ["${__dirname}/server/index.js"],
      env: { [CONNECTION_ENV]: connectionPath },
    },
  },
  tools: tools.map(({ name, description }) => ({ name, description })),
});

export const buildExtension = (input: ExtensionInput): Buffer =>
  zipStored([
    { path: "manifest.json", content: JSON.stringify(extensionManifest(input), null, 2) },
    { path: "server/index.js", content: BRIDGE_SOURCE },
  ]);
