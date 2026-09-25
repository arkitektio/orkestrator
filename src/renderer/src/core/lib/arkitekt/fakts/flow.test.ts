import { beforeEach, describe, expect, it, vi } from "vitest";

const opened: string[] = [];

const authorization: Record<string, unknown> = {
  status: "granted",
  device_code: "dc",
  user_code: "ABCD-1234",
  client_id: "cid",
  token_endpoint: "https://lok.test/lok/o/token/",
  verification_uri: "https://lok.test/configure/",
  verification_uri_complete: "https://lok.test/configure/ABCD-1234",
  expires_in: 600,
  interval: 1,
};

vi.mock("./start", () => ({
  deviceAuthorization: vi.fn(async () => ({ ...authorization })),
}));
const mesh = { available: true };
vi.mock("@/core/lib/mesh/bridge", () => ({
  meshAvailable: () => mesh.available,
}));
vi.mock("./popout", () => ({
  popOutWindowOpen: vi.fn(async (url: string) => {
    opened.push(url);
    return { close: async () => {} };
  }),
}));
const grant: { mesh?: unknown } = {};
vi.mock("./pollToken", () => ({
  pollToken: vi.fn(async () => ({ fakts: {}, token: {}, ...grant })),
}));

const { flow } = await import("./flow");
const { deviceAuthorization } = await import("./start");

const run = (
  hint?: { hub?: string | null; sub?: string | null },
  endpoint: Record<string, unknown> = {},
  requestMeshKey?: boolean,
) =>
  flow({
    endpoint: { device_authorization_endpoint: "https://lok.test/lok/o/app-authorization/", ...endpoint } as never,
    controller: new AbortController(),
    manifest: {} as never,
    hint,
    requestMeshKey,
  });

beforeEach(() => {
  opened.length = 0;
  mesh.available = true;
  delete grant.mesh;
  vi.mocked(deviceAuthorization).mockClear();
});

describe("flow", () => {
  it("opens the configure page naming the account being re-approved", async () => {
    // The whole point of the hint: the browser may hold several accounts, and
    // only the app knows which one's session just expired.
    await run({ hub: "h1", sub: "u1" });

    const url = new URL(opened[0]);
    expect(url.pathname).toBe("/configure/ABCD-1234");
    expect(url.searchParams.get("hub")).toBe("h1");
    expect(url.searchParams.get("sub")).toBe("u1");
  });

  it("opens the server's URL untouched for a first-time grant", async () => {
    await run();
    expect(opened[0]).toBe("https://lok.test/configure/ABCD-1234");
  });
});

describe("flow — mesh key", () => {
  it("asks lok for a key on every login to a deployment that has a mesh", async () => {
    await run();
    expect(vi.mocked(deviceAuthorization).mock.calls[0][0]).toMatchObject({ requestAuthKey: false });

    await run(undefined, { mesh_coord_url: "https://mesh.test" });
    expect(vi.mocked(deviceAuthorization).mock.calls[1][0]).toMatchObject({ requestAuthKey: true });
  });

  it("does not ask for a key when the re-approved profile has its mesh off, or there is no mesh client", async () => {
    await run(undefined, { mesh_coord_url: "https://mesh.test" }, false);
    expect(vi.mocked(deviceAuthorization).mock.calls[0][0]).toMatchObject({ requestAuthKey: false });

    mesh.available = false;
    await run(undefined, { mesh_coord_url: "https://mesh.test" });
    expect(vi.mocked(deviceAuthorization).mock.calls[1][0]).toMatchObject({ requestAuthKey: false });
  });

  it("hands the key from the grant's token response back to the caller, and uses nothing itself", async () => {
    grant.mesh = { authKey: "tskey-auth-minted", controlUrl: "https://mesh.test" };
    const result = await run();
    expect(result.mesh).toEqual({ authKey: "tskey-auth-minted", controlUrl: "https://mesh.test" });
  });

  it("copes with a grant that carries no key", async () => {
    const result = await run();
    expect(result.mesh).toBeUndefined();
  });
});
