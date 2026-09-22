import { beforeEach, describe, expect, it, vi } from "vitest";

const opened: string[] = [];

vi.mock("./start", () => ({
  deviceAuthorization: vi.fn(async () => ({
    status: "granted",
    device_code: "dc",
    user_code: "ABCD-1234",
    client_id: "cid",
    token_endpoint: "https://lok.test/lok/o/token/",
    verification_uri: "https://lok.test/configure/",
    verification_uri_complete: "https://lok.test/configure/ABCD-1234",
    expires_in: 600,
    interval: 1,
  })),
}));
vi.mock("./popout", () => ({
  popOutWindowOpen: vi.fn(async (url: string) => {
    opened.push(url);
    return { close: async () => {} };
  }),
}));
vi.mock("./pollToken", () => ({
  pollToken: vi.fn(async () => ({ fakts: {}, token: {} })),
}));

const { flow } = await import("./flow");

const run = (hint?: { hub?: string | null; sub?: string | null }) =>
  flow({
    endpoint: { device_authorization_endpoint: "https://lok.test/lok/o/app-authorization/" } as never,
    controller: new AbortController(),
    manifest: {} as never,
    hint,
  });

beforeEach(() => {
  opened.length = 0;
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
