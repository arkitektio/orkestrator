import type { Ward } from "@arkitektio/bsx/ports/engine/types";
import { describe, expect, it, vi } from "vitest";

import type { AppContext, ServiceBuilderMap, ServiceDefinition } from "./types";
import { buildConnectionWards } from "./ward";

const definition = (key: string, extra: Partial<ServiceDefinition> = {}): ServiceDefinition => ({
  key,
  service: `live.arkitekt.${key}`,
  optional: true,
  builder: () => ({ client: undefined }),
  ...extra,
});

const MAP: ServiceBuilderMap = {
  mikro: definition("mikro", { wardKey: "mikro", describe: true, name: "Mikro" }),
  fluss: definition("fluss", { wardKey: "fluss" }),
  lok: definition("lok"),
};

const liveWard = (label: string, describe = true): Ward => ({
  search: vi.fn(async () => [{ label, value: label }]),
  ...(describe ? { describe: vi.fn(async () => [{ key: "from", value: label }]) } : {}),
});

/** A store whose connection the test swaps, as a reconnect does. */
const connection = () => {
  let serviceMap: Record<string, { client: unknown; ward?: Ward }> | undefined;
  const getState = () => ({ connection: serviceMap ? { serviceMap } : undefined }) as unknown as AppContext;
  return {
    getState,
    connect: (map: Record<string, Ward>) => {
      serviceMap = Object.fromEntries(Object.entries(map).map(([key, ward]) => [key, { client: {}, ward }]));
    },
    disconnect: () => {
      serviceMap = undefined;
    },
  };
};

const SEARCH = { query: "query { options }", variables: {} };

describe("buildConnectionWards", () => {
  it("gives one ward per service that declares a wardKey", () => {
    const wards = buildConnectionWards(MAP, connection().getState);
    expect(Object.keys(wards).sort()).toEqual(["fluss", "mikro"]);
  });

  it("searches through the live service's ward", async () => {
    const store = connection();
    const wards = buildConnectionWards(MAP, store.getState);
    store.connect({ mikro: liveWard("a") });
    await expect(wards.mikro.search(SEARCH)).resolves.toEqual([{ label: "a", value: "a" }]);
  });

  it("follows a replaced service: the same ward reaches the new client", async () => {
    const store = connection();
    const wards = buildConnectionWards(MAP, store.getState);
    const held = wards.mikro; // what a search widget memoizes
    store.connect({ mikro: liveWard("old") });
    await held.search(SEARCH);
    store.connect({ mikro: liveWard("new") });
    await expect(held.search(SEARCH)).resolves.toEqual([{ label: "new", value: "new" }]);
  });

  it("says so while the service is not connected", async () => {
    const store = connection();
    const wards = buildConnectionWards(MAP, store.getState);
    await expect(wards.mikro.search(SEARCH)).rejects.toThrow("Mikro is not connected");
    store.connect({ mikro: liveWard("a") });
    store.disconnect();
    await expect(wards.mikro.search(SEARCH)).rejects.toThrow("Mikro is not connected");
  });

  it("can describe only where the definition says so", async () => {
    const store = connection();
    const wards = buildConnectionWards(MAP, store.getState);
    expect(wards.fluss.describe).toBeUndefined();
    store.connect({ mikro: liveWard("a") });
    await expect(wards.mikro.describe?.({ identifier: "@mikro/image", id: "1" })).resolves.toEqual([
      { key: "from", value: "a" },
    ]);
  });
});
