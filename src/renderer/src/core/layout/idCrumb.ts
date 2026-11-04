import { generatePath, matchPath } from "react-router-dom";
import type { ModuleManifest } from "@/core/modules/spec";

/**
 * Which breadcrumb is an object's id, so it can be typed over to jump to
 * another one. The crumbs come from the URL alone, so a crumb is an id when
 * its path is a model's detail route in an installed manifest
 * (`/<namespace>/<path>` or `/<namespace>/<scopedPath>`, ending in `:id`).
 * Pure, so it is tested without a router.
 */

export type IdCrumbMatch = {
  pattern: string;
  params: Record<string, string | undefined>;
  id: string;
};

/** Every detail route the manifests declare, absolute and deduplicated. */
export const detailPatterns = (manifests: readonly Pick<ModuleManifest, "namespace" | "models">[]): string[] => [
  ...new Set(
    manifests.flatMap((manifest) =>
      (manifest.models ?? []).flatMap((model) =>
        [model.path, model.scopedPath]
          .filter((path): path is string => !!path && path.endsWith(":id"))
          .map((path) => `/${manifest.namespace}/${path}`),
      ),
    ),
  ),
];

/** The detail route `pathname` is, with its id, or null when it is none. */
export const matchIdCrumb = (pathname: string, patterns: readonly string[]): IdCrumbMatch | null => {
  for (const pattern of patterns) {
    const match = matchPath({ path: pattern, end: true }, pathname);
    const id = match?.params.id;
    if (match && id) return { pattern, params: match.params, id };
  }
  return null;
};

/** The same route with another id; the rest of its params stay. */
export const pathWithId = (match: IdCrumbMatch, id: string): string =>
  generatePath(match.pattern, { ...match.params, id });
