// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const { state, run } = vi.hoisted(() => ({
  state: {
    serviceStates: { alpaka: { status: "ready" }, kraph: { status: "unconfigured" } },
    connection: { serviceMap: { alpaka: { client: { tag: "alpaka-client" } } } },
  },
  run: vi.fn(async (client: unknown, args: unknown) => ({ client, args })),
}));
vi.mock("@/core/connection/arkitekt/host", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/core/connection/arkitekt/host")>()), Arkitekt: { useStoreApi: () => ({ getState: () => state }) } }));

vi.mock("@/core/modules/registries", () => ({
  MODULE_OPERATIONS: {
    "alpaka.startRoom": { service: "alpaka", run },
    "kraph.down": { service: "kraph", run },
  },
}));

import { useOperation } from "./useOperation";

describe("useOperation", () => {
  it("runs another module's operation with that module's ready client", async () => {
    const { result } = renderHook(() => useOperation("alpaka.startRoom"));
    await expect(result.current({ text: "hi" })).resolves.toEqual({
      client: { tag: "alpaka-client" },
      args: { text: "hi" },
    });
  });

  it("rejects when no module offers it, or its service is not ready", async () => {
    const missing = renderHook(() => useOperation("nobody.here")).result.current;
    await expect(missing({})).rejects.toThrow(/No module offers/);
    const down = renderHook(() => useOperation("kraph.down")).result.current;
    await expect(down({})).rejects.toThrow(/not available/);
  });
});
