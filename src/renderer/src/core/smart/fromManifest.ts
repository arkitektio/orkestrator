import {
  collectionPath,
  modelDecl,
  scopedCollectionPath,
  type ModuleManifest,
} from "@/core/modules/spec";
import type { Object } from "@/core/types";
import { buildScopedSmart, buildSmart } from "./builder";

/**
 * A module's smart objects, built from the models its manifest declares.
 * The manifest is the one place a model's identifier, name, route and datum
 * flag are written; `<module>/linkers.tsx` only names the result.
 */
export const smartOf = <T extends Object = Object>(manifest: ModuleManifest, identifier: string) => {
  const decl = modelDecl(manifest, identifier);
  return buildSmart<T>({
    identifier: decl.identifier,
    path: collectionPath(manifest, decl.path),
    name: decl.name,
    datum: decl.datum,
    ...(decl.description ? { description: decl.description } : {}),
  });
};

/** For a model whose detail page lives inside a scope (see `buildScopedSmart`). */
export const scopedSmartOf = <T extends Object = Object>(manifest: ModuleManifest, identifier: string) => {
  const decl = modelDecl(manifest, identifier);
  if (!decl.scopedPath) throw new Error(`${identifier} declares no scopedPath`);
  return buildScopedSmart<T>({
    identifier: decl.identifier,
    claimPath: collectionPath(manifest, decl.path),
    scopedPath: scopedCollectionPath(manifest, decl.scopedPath),
    name: decl.name,
    datum: decl.datum,
    ...(decl.description ? { description: decl.description } : {}),
  });
};
