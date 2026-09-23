import { describe, expect, it } from "vitest";
import { StoredArkitektSessionSchema } from "./sessionStorageSchema";

/**
 * The protocol-2 migration hinges on one assumption: a session written by the
 * old start/challenge/claim flow must FAIL to parse, so the provider discards
 * it and falls back to a fresh connect.
 *
 * That is not obvious, because zod strips unknown keys rather than rejecting
 * them — the old `fakts.auth` block is silently dropped, not flagged. What
 * actually rejects an old session is the newly *required* fields: `client_id`
 * on the token, and the OAuth endpoints on the discovery document. If either
 * of those ever became optional, the migration would quietly stop firing and
 * the failure would resurface as a broken refresh an hour into the session.
 */

const ALIAS = { id: "a1", host: "localhost", ssl: false, challenge: "ht" };

/** Exactly what this app used to persist, before the OAuth grant. */
const OLD_SESSION = {
  endpoint: {
    name: "test",
    version: "0.1.0",
    description: "A Basic Arkitekt Deployment",
    claim: "https://lok.test/lok/f/claim/",
    base_url: "https://lok.test/lok/f/",
    frontend_url: "https://lok.test/",
    ca_crt: null,
  },
  fakts: {
    instances: { lok: { service: "live.arkitekt.lok", identifier: "3", aliases: [ALIAS] } },
    self: { deployment_name: "test", alias: ALIAS },
    auth: {
      client_id: "cid",
      client_secret: "secret",
      token_url: "https://lok.test/lok/o/token/",
      report_url: "https://lok.test/lok/f/report/",
      client_token: "opaque",
    },
  },
  token: {
    access_token: "at",
    token_type: "Bearer",
    expires_in: 3600,
    refresh_token: "rt",
    received_at: 1_700_000_000_000,
  },
  aliasMap: { aliasMap: { lok: ALIAS } },
};

const NEW_SESSION = {
  endpoint: {
    name: "test",
    version: "0.1.0",
    description: "A Basic Arkitekt Deployment",
    base_url: "https://lok.test/lok/f/",
    frontend_url: "https://lok.test/",
    configure: "https://lok.test/configure/{code}",
    device_authorization_endpoint: "https://lok.test/lok/o/app-authorization/",
    token_endpoint: "https://lok.test/lok/o/token/",
  },
  fakts: {
    instances: { lok: { service: "live.arkitekt.lok", identifier: "3", aliases: [ALIAS] } },
    self: { deployment_name: "test", alias: ALIAS },
    statuses: { lok: "granted" },
  },
  token: {
    access_token: "at",
    token_type: "Bearer",
    expires_in: 3600,
    refresh_token: "rt",
    client_id: "cid",
    received_at: 1_700_000_000_000,
  },
  aliasMap: { aliasMap: { lok: ALIAS } },
};

describe("StoredArkitektSessionSchema", () => {
  it("rejects a session written by the pre-OAuth flow", () => {
    const parsed = StoredArkitektSessionSchema.safeParse(OLD_SESSION);
    expect(parsed.success).toBe(false);

    // Pin *why* it is rejected, so the migration cannot silently stop firing.
    const paths = parsed.error!.issues.map((i) => i.path.join("."));
    expect(paths).toContain("token.client_id");
    expect(paths).toContain("endpoint.token_endpoint");
    expect(paths).toContain("endpoint.device_authorization_endpoint");
  });

  it("accepts a session written by the device-code grant", () => {
    const parsed = StoredArkitektSessionSchema.safeParse(NEW_SESSION);
    expect(parsed.success).toBe(true);
    // `statuses` defaults rather than failing: registrations predating the
    // feature simply omit it.
    const { statuses, ...rest } = NEW_SESSION.fakts;
    expect(
      StoredArkitektSessionSchema.safeParse({ ...NEW_SESSION, fakts: rest }).data?.fakts
        .statuses,
    ).toEqual({});
  });

  it("round-trips received_at, which the refresh check depends on", () => {
    // `shouldRefreshToken` returns false when `received_at` is missing, so a
    // token that loses it on the storage round-trip would never refresh and the
    // app would run on an expired access token until the 401s started.
    const parsed = StoredArkitektSessionSchema.parse(NEW_SESSION);
    const rehydrated = StoredArkitektSessionSchema.parse(JSON.parse(JSON.stringify(parsed)));
    expect(rehydrated.token.received_at).toBe(1_700_000_000_000);
    expect(rehydrated.token.expires_in).toBe(3600);
  });
});
