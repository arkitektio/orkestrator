import { MODULE_ALIASES } from "@/core/app/components/navigation/ModuleRedirect";
import type { ModuleManifest } from "@/core/lib/module-spec";

/** Host-owned top-level routes that are not modules. */
const HOST_PATHS = ["settings", "blok"] as const;

/**
 * The top-level path segments a module (or the host) is mounted under. Used
 * to tell "unknown page inside a known module" apart from "unknown module".
 */
export const modulePathsOf = (manifests: readonly ModuleManifest[]): string[] => [
  ...manifests.map((manifest) => manifest.namespace),
  ...HOST_PATHS,
  ...Object.keys(MODULE_ALIASES),
];
