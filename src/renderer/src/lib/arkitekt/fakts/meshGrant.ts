import { z } from "zod";

/**
 * The mesh credential lok may mint with a grant.
 *
 * It rides as `auth` on the token response of the device-code grant — the
 * one response that ends the poll — when the authorization request carried
 * `request_auth_key: true` and the approver, the deployment and ionscale all
 * agreed. It is minted once, on approval, and burned with the device code,
 * so no refresh-token response ever repeats it. A pre-auth key for the
 * control server named in `.well-known/fakts` (`mesh_coord_url`), it expires
 * within minutes and is used exactly once to join
 * (`lib/mesh/profileMesh.ts`); after that the node's own state carries
 * the login. The block can be missing for any of those reasons, so the
 * interactive sign-in stays the fallback.
 */
export const MeshGrantSchema = z.object({
  ionscale_auth_key: z.string().optional().nullable(),
  ionscale_coord_url: z.string().optional().nullable(),
});

export type MeshGrant = z.infer<typeof MeshGrantSchema>;

/** Never persisted by the renderer. */
export type GrantedMesh = {
  authKey: string;
  controlUrl?: string;
};

export const grantedMesh = (auth: MeshGrant | null | undefined): GrantedMesh | undefined =>
  auth?.ionscale_auth_key
    ? { authKey: auth.ionscale_auth_key, controlUrl: auth.ionscale_coord_url ?? undefined }
    : undefined;
