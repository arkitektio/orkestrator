import { describe, expect, it } from "vitest";

import { emptyProfileBook, type StoredProfileBook } from "./profileStorageSchema";
import { faktsHostsOf } from "./trustedHosts";

const endpointFor = (host: string, tokenHost = host) => ({
  name: `deployment at ${host}`,
  version: "0.1.0",
  base_url: `https://${host}/lok/f/`,
  device_authorization_endpoint: `https://${host}/lok/o/app-authorization/`,
  token_endpoint: `https://${tokenHost}/lok/o/token/`,
});

const alias = (host: string) => ({ id: host, host, ssl: true, challenge: "ht" });

const profileFor = (host: string, serviceHosts: string[]) => ({
  id: host,
  session: {
    endpoint: endpointFor(host, `auth.${host}`),
    fakts: {
      instances: {
        mikro: { service: "live.arkitekt.mikro", identifier: "1", aliases: serviceHosts.map(alias) },
      },
      self: { deployment_name: host, alias: alias(host) },
      statuses: {},
    },
    token: {
      access_token: "at",
      token_type: "Bearer",
      expires_in: 3600,
      refresh_token: "rt",
      client_id: "cid",
      received_at: 0,
    },
    aliasMap: { aliasMap: {} },
  },
  identity: { baseUrl: `https://${host}/lok/f/`, userId: null, organizationId: null },
  label: {},
  status: "ok" as const,
  createdAt: 0,
  lastUsedAt: 0,
});

describe("faktsHostsOf", () => {
  it("is empty for an empty book", () => {
    expect(faktsHostsOf(emptyProfileBook())).toEqual([]);
  });

  it("collects every endpoint and alias host of every profile, once", () => {
    const book = {
      ...emptyProfileBook(),
      lastEndpoint: endpointFor("Next.Lab"),
      profiles: {
        a: profileFor("lab.local", ["mikro.lab.local", "192.168.1.20"]),
        b: profileFor("go.arkitekt.live", ["mikro.lab.local"]),
      },
    } as unknown as StoredProfileBook;

    expect(faktsHostsOf(book)).toEqual([
      "192.168.1.20",
      "auth.go.arkitekt.live",
      "auth.lab.local",
      "go.arkitekt.live",
      "lab.local",
      "mikro.lab.local",
      "next.lab",
    ]);
  });
});
