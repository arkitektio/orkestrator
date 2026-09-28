import type { ModuleManifest } from "@/core/modules/spec";

/**
 * Dokuments: what this module is, as data (module spec v1). The host reads
 * it; nothing in here may be code. `./module.tsx` holds the builtins the
 * manifest refers to by id.
 */
export const manifest: ModuleManifest = {
  schema: 1,
  namespace: "dokuments",
  service: "live.arkitekt.dokuments",
  version: "0.0.0",
  label: "Dokuments",
  icon: "file-text",
  models: [
    { identifier: "@dokuments/file", name: "File (Dokuments)", datum: true, path: "files/:id" },
    { identifier: "@dokuments/document", name: "Document", datum: true, path: "documents/:id" },
    { identifier: "@dokuments/page", name: "Page", datum: true, path: "pages/:id" },
  ],
};
