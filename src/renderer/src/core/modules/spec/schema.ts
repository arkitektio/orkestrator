import { z } from "zod";

import type { ModuleManifest } from "./types";

/**
 * Runtime validation for a manifest, written to the evolution rules of v1:
 * unknown FIELDS are ignored (loose objects), unknown condition types, perform
 * kinds and surface kinds are kept (the host skips them at use, it does not
 * reject the module), and only a wrong `schema` major is refused.
 */

const identifier = z.string().regex(/^@[^/]+\/[^/]+$/, "expected @<namespace>/<model>");

const condition = z.looseObject({ type: z.string() });

const perform = z.looseObject({ kind: z.string() });

const render = z.looseObject({ renderer: z.string() });

export const modelDeclSchema = z.looseObject({
  identifier,
  name: z.string(),
  datum: z.boolean(),
  path: z.string(),
  describe: z.boolean().optional(),
  description: z.string().optional(),
  scopedPath: z.string().optional(),
});

export const actionDeclSchema = z.looseObject({
  id: z.string(),
  title: z.string(),
  icon: z.string().optional(),
  conditions: z.array(condition),
  perform,
});

export const surfaceDeclSchema = z.looseObject({
  id: z.string(),
  kind: z.string(),
  match: z
    .looseObject({
      identifier: z.string().optional(),
      port: z.string().optional(),
      datum: z.boolean().optional(),
    })
    .optional(),
  placement: z.string().optional(),
  title: z.string().optional(),
  render,
});

export const moduleManifestSchema = z.looseObject({
  schema: z.literal(1),
  namespace: z.string().regex(/^[a-z][a-z0-9]*$/, "lowercase letters and digits only"),
  service: z.string(),
  version: z.string(),
  label: z.string(),
  icon: z.string().optional(),
  models: z.array(modelDeclSchema).optional(),
  actions: z.array(actionDeclSchema).optional(),
  surfaces: z.array(surfaceDeclSchema).optional(),
  search: z.array(z.looseObject({ identifier, operation: z.string() })).optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
  requires: z
    .looseObject({
      capabilities: z.array(z.string()).optional(),
      services: z.array(z.string()).optional(),
    })
    .optional(),
});

export type ManifestIssue = { path: string; message: string };

/**
 * Validates `value` as a v1 manifest and checks what the schema cannot:
 * every model, search and matched identifier lives in the module's own
 * namespace, and ids are unique per list.
 */
export const validateManifest = (
  value: unknown,
): { ok: true; manifest: ModuleManifest } | { ok: false; issues: ManifestIssue[] } => {
  const parsed = moduleManifestSchema.safeParse(value);
  if (!parsed.success) {
    return {
      ok: false,
      issues: parsed.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    };
  }
  const manifest = parsed.data as unknown as ModuleManifest;
  const issues: ManifestIssue[] = [];
  const own = `@${manifest.namespace}/`;

  manifest.models?.forEach((model, index) => {
    if (!model.identifier.startsWith(own)) {
      issues.push({ path: `models.${index}.identifier`, message: `not in namespace ${manifest.namespace}` });
    }
  });
  manifest.search?.forEach((search, index) => {
    if (!search.identifier.startsWith(own)) {
      issues.push({ path: `search.${index}.identifier`, message: `not in namespace ${manifest.namespace}` });
    }
  });

  const unique = (list: { id: string }[] | undefined, name: string) => {
    const seen = new Set<string>();
    list?.forEach((item, index) => {
      if (seen.has(item.id)) issues.push({ path: `${name}.${index}.id`, message: `duplicate id ${item.id}` });
      seen.add(item.id);
    });
  };
  unique(manifest.actions, "actions");
  unique(manifest.surfaces, "surfaces");

  return issues.length ? { ok: false, issues } : { ok: true, manifest };
};
