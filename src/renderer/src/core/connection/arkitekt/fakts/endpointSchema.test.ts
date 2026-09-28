import { describe, expect, it } from "vitest";
import { FaktsEndpointSchema } from "./endpointSchema";

/**
 * Pins the client schema against real `.well-known/fakts` documents.
 *
 * PROTOCOL_2 is captured verbatim from a lok-server-next deployment (the
 * `feat!: promote fakts as a oauth2grant` release). If the server ever renames
 * or drops one of the endpoint fields the flow runs on, this fails here rather
 * than as an opaque "no valid endpoint discovered" at connect time.
 */

const PROTOCOL_2 = {
  name: "default",
  version: "0.1.0",
  protocol_version: "2",
  description: "A Basic Arkitekt Deployment",
  base_url: "http://localhost/lok/f/",
  frontend_url: "http://localhost/",
  configure: "http://localhost/configure/{code}",
  issuer: "http://lok",
  device_authorization_endpoint: "http://localhost/lok/o/app-authorization/",
  token_endpoint: "http://localhost/lok/o/token/",
  jwks_uri: "http://localhost/lok/o/jwks/",
  grant_types_supported: [
    "authorization_code",
    "refresh_token",
    "urn:ietf:params:oauth:grant-type:device_code",
    "urn:fakts:grant-type:redeem",
  ],
  token_endpoint_auth_methods_supported: [
    "client_secret_basic",
    "client_secret_post",
    "none",
  ],
  mesh_coord_url: "https://ionscale.arkitekt.live",
  mesh_device_code_start: "http://localhost/lok/f/meshstart/",
  mesh_challenge_url: "http://localhost/lok/f/meshchallenge/",
  mesh_configure: "http://localhost/meshconfigure/{code}",
  hub_authorization_endpoint: "http://localhost/lok/o/hub-authorization/",
  hub_claim: "http://localhost/lok/f/claimhub/",
  hub_configure: "http://localhost/hubconfigure/{code}",
};

/** A pre-OAuth deployment, captured from go.arkitekt.live. */
const PROTOCOL_1 = {
  name: "test",
  version: "0.1.0",
  description: "A Basic Arkitekt Deployment",
  claim: "https://go.arkitekt.live/lok/f/claim/",
  base_url: "https://go.arkitekt.live/lok/f/",
  ca_crt: null,
};

describe("FaktsEndpointSchema", () => {
  it("accepts a real protocol-2 discovery document", () => {
    const parsed = FaktsEndpointSchema.parse(PROTOCOL_2);

    expect(parsed.token_endpoint).toBe("http://localhost/lok/o/token/");
    expect(parsed.device_authorization_endpoint).toBe(
      "http://localhost/lok/o/app-authorization/",
    );
    // `{code}` is substituted server-side into verification_uri_complete; we
    // only ever use the completed URL, but the template must still parse.
    expect(parsed.configure).toBe("http://localhost/configure/{code}");
    // base_url keeps its trailing slash — `report()` appends "report/" to it.
    expect(parsed.base_url.endsWith("/")).toBe(true);
  });

  it("rejects a pre-OAuth deployment, naming the endpoints it lacks", () => {
    const parsed = FaktsEndpointSchema.safeParse(PROTOCOL_1);
    expect(parsed.success).toBe(false);

    const paths = parsed.error!.issues.map((i) => i.path.join("."));
    expect(paths).toEqual(
      expect.arrayContaining(["device_authorization_endpoint", "token_endpoint"]),
    );
  });
});
