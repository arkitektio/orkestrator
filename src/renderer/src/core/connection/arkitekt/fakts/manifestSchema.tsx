import { z } from "zod";

export const RequirementSchema = z.object({
  key: z.string(),
  service: z.string(),
  optional: z.boolean().optional(),
});

/** Where the app can be found. lok reads a client's issue tracker off the `github` one. */
export const PublicSourceSchema = z.object({
  kind: z.enum(["github", "website"]),
  url: z.string().url(),
});

export const ManifestSchema = z.object({
  version: z.string(),
  identifier: z.string(),
  scopes: z.array(z.string()),
  logo: z.string().url().optional(),
  requirements: z.array(RequirementSchema),
  public_sources: z.array(PublicSourceSchema).optional(),
});

export type Manifest = z.infer<typeof ManifestSchema>;
export type Requirement = z.infer<typeof RequirementSchema>;
