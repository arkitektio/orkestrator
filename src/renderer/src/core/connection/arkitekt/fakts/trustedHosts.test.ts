import { describe, expect, it } from "vitest";

import { PROFILE_BOOK_STORAGE_KEY as SEED_STORAGE_KEY, hostsOfProfileBook, trustOfProfileBook } from "../../../../../../main/trust/hosts";
import { PROFILE_BOOK_STORAGE_KEY, emptyProfileBook, type StoredProfileBook } from "./profileStorageSchema";
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

describe("the preload's view of the book", () => {
  it("reads the same storage key the renderer writes", () => {
    expect(SEED_STORAGE_KEY).toBe(PROFILE_BOOK_STORAGE_KEY);
  });

  it("skips what it cannot read instead of throwing", () => {
    expect(hostsOfProfileBook(null)).toEqual([]);
    expect(hostsOfProfileBook("nope")).toEqual([]);
    expect(
      hostsOfProfileBook({
        lastEndpoint: { base_url: "not a url" },
        profiles: {
          broken: { session: { fakts: { instances: { x: { aliases: [{ host: 3 }, null] } } } } },
          ok: { session: { fakts: { self: { alias: { host: "Lab.Local" } }, instances: {} } } },
        },
      }),
    ).toEqual(["lab.local"]);
  });
});

describe("pins", () => {
  const PEM = "-----BEGIN CERTIFICATE-----\nAA==\n-----END CERTIFICATE-----";
  it("pin a strict instance's TLS hosts to its certificates, and nothing else", () => {
    const book = {
      profiles: {
        a: {
          session: {
            fakts: {
              self: { alias: { host: "lab.local" } },
              instances: {
                mikro: {
                  tls: { certificates: [PEM] },
                  aliases: [
                    { host: "lab.local", ssl: true },
                    { host: "lab.local", ssl: false },
                    { host: "mikro.lab.ts.net", ssl: false },
                  ],
                },
                plain: { aliases: [{ host: "other.local", ssl: true }] },
              },
            },
          },
        },
      },
    };
    const { hosts, pins } = trustOfProfileBook(book);
    expect(pins).toEqual({ "lab.local": [PEM] });
    expect(hosts).toContain("other.local");
    expect(hosts).toContain("mikro.lab.ts.net");
  });
});
