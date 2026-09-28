import { EnhancedManifest } from "../types";
import { FaktsEndpoint } from "./endpointSchema";
import { withGrantHint, type GrantHint } from "./grantHint";
import { GrantResult, pollToken } from "./pollToken";
import { popOutWindowOpen } from "./popout";
import { deviceAuthorization } from "./start";
import { meshAvailable } from "@/core/connection/mesh/bridge";

/**
 * The canonical fakts grant: register + stage a device code, let a human
 * approve it, then poll the OAuth2 token endpoint once. Tokens and the
 * rendered service instances come back together in that single response —
 * there is no separate claim or client_credentials trip any more.
 */
export const flow = async ({
  endpoint,
  controller,
  manifest,
  expirationTime,
  hint,
  requestMeshKey = true,
  onVerificationUri,
}: {
  endpoint: FaktsEndpoint;
  controller: AbortController;
  manifest: EnhancedManifest;
  expirationTime?: number;
  /**
   * Who to preselect on the configure page — set when we already know whose
   * session this grant is reviving. See `grantHint.ts`.
   */
  hint?: GrantHint;
  /** `false` when the profile being re-approved has its mesh switched off. */
  requestMeshKey?: boolean;
  /** The approval page's URL, once opened — so the caller can offer to open it again. */
  onVerificationUri?: (uri: string) => void;
}): Promise<GrantResult> => {
  // 1. Device authorization (also dynamically registers our public client).
  //    A deployment with a mesh is asked for a one-shot key — unless this is
  //    a build without the mesh client, or the profile being re-approved has
  //    its mesh switched off (Settings › Mesh). Whether one comes back is the
  //    approver's call. lok dedups by device_id, so asking every time does
  //    not pile up machines.
  const authorization = await deviceAuthorization({
    endpoint,
    controller,
    manifest,
    expirationTime,
    requestAuthKey: !!endpoint.mesh_coord_url && requestMeshKey && meshAvailable(),
  });

  // 2. Open the configure page for the human, telling it which account and hub
  //    we are coming back as when we know (a re-approval), so they are not
  //    asked to find themselves in a list they did not expect.
  const verificationUri = withGrantHint(authorization.verification_uri_complete, hint);
  const handle = await popOutWindowOpen(verificationUri);
  onVerificationUri?.(verificationUri);

  // 3. Poll the token endpoint until approved → tokens + instances
  try {
    const result = await pollToken({
      tokenEndpoint: authorization.token_endpoint,
      deviceCode: authorization.device_code,
      clientId: authorization.client_id,
      controller,
      interval: authorization.interval,
      expiresIn: authorization.expires_in,
    });
    // The key, if lok minted one, rides back in `result.mesh`; the caller
    // puts the mesh on the profile and uses the key once (`profileMesh.ts`).
    return result;
  } finally {
    await handle?.close();
  }
};
