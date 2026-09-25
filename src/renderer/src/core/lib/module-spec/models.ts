import type { ModelDecl, ModuleManifest } from "./types";

/**
 * Route templates in a manifest are relative to the module's namespace and
 * end in `/:id` (`"graphs/:id"`); the host's router wants the collection path
 * under the namespace (`"kraph/graphs"`). These are the only conversions.
 */

const stripId = (template: string) => template.replace(/\/:id$/, "");

export const modelDecl = (manifest: ModuleManifest, identifier: string): ModelDecl => {
  const decl = manifest.models?.find((model) => model.identifier === identifier);
  if (!decl) throw new Error(`${manifest.namespace} declares no model ${identifier}`);
  return decl;
};

/** `"graphs/:id"` in namespace kraph -> `"kraph/graphs"`. */
export const collectionPath = (manifest: ModuleManifest, template: string): string =>
  `${manifest.namespace}/${stripId(template)}`;

/** `"graphs/:scope/nodes/:id"` -> `(scope) => "kraph/graphs/<scope>/nodes"`. */
export const scopedCollectionPath =
  (manifest: ModuleManifest, template: string) =>
  (scope: string): string =>
    collectionPath(manifest, template).replace(":scope", scope);
