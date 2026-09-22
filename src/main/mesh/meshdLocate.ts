import { join } from "node:path";

/**
 * Where the mesh sidecar binary lives.
 *
 * Packaged: electron-builder copies `resources/meshd/<os>-<arch>/` to
 * `<resourcesPath>/meshd/` (see `extraResources` in electron-builder.yml).
 * Development: the per-target directory that `scripts/build-meshd.mjs`
 * writes into, under the repository's `resources/meshd/`.
 *
 * Like the doctor's Tailscale lookup, this is a FIXED path, never a PATH
 * search: the binary we spawn is one we shipped.
 */

export type MeshdLocation = {
  packaged: boolean;
  resourcesPath: string;
  /** The repository root in development. */
  appRoot: string;
  platform: NodeJS.Platform;
  arch: string;
};

const OS_DIR: Partial<Record<NodeJS.Platform, string>> = { darwin: "mac", win32: "win", linux: "linux" };

export const meshdBinaryPath = (location: MeshdLocation): string | undefined => {
  const os = OS_DIR[location.platform];
  if (!os) return undefined;
  const file = location.platform === "win32" ? "meshd.exe" : "meshd";
  if (location.packaged) return join(location.resourcesPath, "meshd", file);
  const arch = location.arch === "arm64" ? "arm64" : "x64";
  return join(location.appRoot, "resources", "meshd", `${os}-${arch}`, file);
};
