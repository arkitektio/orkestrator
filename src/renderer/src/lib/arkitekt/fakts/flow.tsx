import { EnhancedManifest } from "../types";
import { FaktsEndpoint } from "./endpointSchema";
import { withGrantHint, type GrantHint } from "./grantHint";
import { GrantResult, pollToken } from "./pollToken";
import { popOutWindowOpen } from "./popout";
import { deviceAuthorization } from "./start";

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
}): Promise<GrantResult> => {
  // 1. Device authorization (also dynamically registers our public client)
  const authorization = await deviceAuthorization({
    endpoint,
    controller,
    manifest,
    expirationTime,
  });

  // 2. Open the configure page for the human, telling it which account and hub
  //    we are coming back as when we know (a re-approval), so they are not
  //    asked to find themselves in a list they did not expect.
  const handle = await popOutWindowOpen(
    withGrantHint(authorization.verification_uri_complete, hint),
  );

  // 3. Poll the token endpoint until approved → tokens + instances
  try {
    return await pollToken({
      tokenEndpoint: authorization.token_endpoint,
      deviceCode: authorization.device_code,
      clientId: authorization.client_id,
      controller,
      interval: authorization.interval,
      expiresIn: authorization.expires_in,
    });
  } finally {
    await handle?.close();
  }
};
