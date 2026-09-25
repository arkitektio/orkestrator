import { z } from "zod";

// Alias type
export const AliasSchema = z.object({
  id: z.string(),
  port: z.number().optional().nullable(),
  host: z.string(),
  ssl: z.boolean(),
  path: z.string().optional().nullable(),
  challenge: z.string(),
  public: z.boolean().optional(),
});

// Ed25519 public key for verifying signed alias challenges.
export const ChallengeKeySchema = z.object({
  kind: z.string(),
  key: z.string(),
});

// Instance type
export const InstanceSchema = z.object({
  identifier: z.string(),
  service: z.string(),
  aliases: z.array(AliasSchema),
  challenge_key: ChallengeKeySchema.optional().nullable(),
});

// SelfFakt type
export const SelfFaktSchema = z.object({
  deployment_name: z.string(),
  alias: AliasSchema,
  /**
   * Who this grant is for, as lok's ids: the user (`sub`), the organization
   * and the hub it was approved into. Enough to derive the profile's final
   * id at admission, with no provisional id to re-key once `mycontext`
   * answers. Absent from deployments that predate it, and from fakts stored
   * before it existed.
   */
  sub: z.string().nullish(),
  organization: z.string().nullish(),
  hub: z.string().nullish(),
});

/**
 * The fakts envelope, as appended to a successful OAuth2 token response.
 *
 * There is no `auth` block any more: the access token, refresh token and
 * client_id are the standard token-response fields these travel next to.
 */
export const ActiveFaktsSchema = z.object({
  instances: z.record(z.string(), InstanceSchema),
  self: SelfFaktSchema,
  /**
   * Per-requirement grant outcomes: 'granted' | 'denied' | 'unavailable'.
   * Omitted by registrations that predate the feature.
   */
  statuses: z.record(z.string(), z.string()).optional().default({}),
});

// Generate types from schemas
export type Alias = z.infer<typeof AliasSchema>;
export type ChallengeKey = z.infer<typeof ChallengeKeySchema>;
export type Instance = z.infer<typeof InstanceSchema>;
export type SelfFakt = z.infer<typeof SelfFaktSchema>;
export type ActiveFakts = z.infer<typeof ActiveFaktsSchema>;

/** Who a grant is for, in the terms `deriveProfileId` keys a profile by. */
export type GrantIdentity = { userId: string; orgId: string | null; hubId: string | null };

/** The identity `self` carries, or undefined on a deployment that predates it. */
export const grantIdentity = (self: SelfFakt): GrantIdentity | undefined =>
  self.sub ? { userId: self.sub, orgId: self.organization ?? null, hubId: self.hub ?? null } : undefined;
