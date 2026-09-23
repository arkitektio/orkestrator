import { z } from "zod";

/**
 * The `.well-known/fakts` document (protocol 2).
 *
 * The two OAuth endpoints the flow actually runs on are required: a
 * deployment that still speaks the pre-OAuth protocol (start → challenge →
 * claim) has neither and fails discovery here, loudly, instead of
 * half-working later.
 */
export const FaktsEndpointSchema = z.object({
  name: z.string(),
  version: z.string(),
  protocol_version: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  base_url: z.string().url(),
  /**
   * Still sent by servers, read by nothing here: the device grant opens
   * `verification_uri_complete`. Optional so a deployment that drops them
   * keeps working.
   */
  frontend_url: z.string().url().optional().nullable(),
  configure: z.string().url().optional().nullable(),
  /** RFC 8628 device authorization + dynamic client registration. */
  device_authorization_endpoint: z.string().url(),
  /** The OAuth2 token endpoint: device-code poll, then refresh. */
  token_endpoint: z.string().url(),

  /**
   * The organisation mesh: the ionscale control server this deployment's
   * tailnets live on. Orkestrator's built-in mesh client joins it with the
   * key the approver grants at login (`lib/mesh/profileMesh.ts`).
   * Absent on a deployment without a mesh. (The document also lists a
   * separate mesh device-code flow — `mesh_device_code_start` and friends —
   * which is obsolete and ignored.)
   */
  mesh_coord_url: z.string().url().optional().nullable(),

  issuer: z.string().optional().nullable(),
  jwks_uri: z.string().url().optional().nullable(),
  grant_types_supported: z.array(z.string()).optional(),
  token_endpoint_auth_methods_supported: z.array(z.string()).optional(),
});

export type FaktsEndpoint = z.infer<typeof FaktsEndpointSchema>;
