import type { ModuleManifest } from "@/core/modules/spec";

/**
 * Omero Ark: what this module is, as data (module spec v1). The host reads
 * it; nothing in here may be code. `./module.tsx` holds the builtins the
 * manifest refers to by id.
 */
export const manifest: ModuleManifest = {
  schema: 1,
  namespace: "omeroark",
  service: "live.arkitekt.omero_ark",
  version: "0.0.0",
  label: "Omero Ark",
  icon: "database",
  models: [
    { identifier: "@omeroark/project", name: "Project", datum: false, path: "projects/:id" },
    { identifier: "@omeroark/dataset", name: "Dataset (Omero Ark)", datum: true, path: "datasets/:id" },
    { identifier: "@omeroark/image", name: "Image (Omero Ark)", datum: true, path: "images/:id" },
  ],
};
