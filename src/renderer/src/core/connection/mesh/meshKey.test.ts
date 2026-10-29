import { afterEach, describe, expect, it, vi } from "vitest";
import {
  freshPacing,
  MESH_KEY_MAX_KEYS,
  MESH_KEY_SETTLE_MS,
  MESH_KEY_THROTTLE_MS,
  paceAfter,
  requestMeshKey,
} from "./meshKey";

const answer = (status: number, body?: unknown, headers: Record<string, string> = {}) =>
  vi.fn(async () => new Response(body === undefined ? null : JSON.stringify(body), { status, headers }));

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("requestMeshKey", () => {
  it("posts to /f/meshkey/ with the access token and reads the key", async () => {
    const fetch = answer(200, { ionscale_auth_key: "tskey-new", ionscale_coord_url: "https://mesh.arkitekt.live" });
    vi.stubGlobal("fetch", fetch);
    const outcome = await requestMeshKey("https://go.arkitekt.live/lok/f/", "at-1");
    expect(outcome).toEqual({ kind: "key", mesh: { authKey: "tskey-new", controlUrl: "https://mesh.arkitekt.live" } });
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://go.arkitekt.live/lok/f/meshkey/");
    expect(init).toMatchObject({ method: "POST", headers: { Authorization: "Bearer at-1" } });
  });

  it("also reads the key block nested as on the token response", async () => {
    vi.stubGlobal("fetch", answer(200, { mesh: { ionscale_auth_key: "tskey-nested" } }));
    expect(await requestMeshKey("https://lok/f/", "at")).toEqual({ kind: "key", mesh: { authKey: "tskey-nested" } });
  });

  it("names each refusal", async () => {
    for (const [status, kind] of [
      [401, "not-live"],
      [403, "not-enrolled"],
      [409, "connected"],
    ] as const) {
      vi.stubGlobal("fetch", answer(status, { error: "x" }));
      expect(await requestMeshKey("https://lok/f/", "at")).toEqual({ kind });
    }
    vi.stubGlobal("fetch", answer(429, { error: "throttled" }, { "Retry-After": "120" }));
    expect(await requestMeshKey("https://lok/f/", "at")).toEqual({ kind: "throttled", retryAfterMs: 120_000 });
    vi.stubGlobal("fetch", answer(429, { error: "throttled" }, { "Retry-After": "5" }));
    expect(await requestMeshKey("https://lok/f/", "at")).toEqual({ kind: "throttled", retryAfterMs: MESH_KEY_THROTTLE_MS });
  });

  it("a keyless answer or a network failure is a failure, never a key", async () => {
    vi.stubGlobal("fetch", answer(200, { ok: true }));
    expect((await requestMeshKey("https://lok/f/", "at")).kind).toBe("failed");
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new TypeError("offline"))));
    expect(await requestMeshKey("https://lok/f/", "at")).toEqual({ kind: "failed", error: "offline" });
  });
});

describe("paceAfter", () => {
  it("waits for a key to land, and stops after a few that never did", () => {
    let pacing = freshPacing();
    for (let i = 1; i <= MESH_KEY_MAX_KEYS; i++) {
      pacing = paceAfter(pacing, { kind: "key", mesh: { authKey: "k" } }, 1000);
      expect(pacing.notBefore).toBe(1000 + MESH_KEY_SETTLE_MS);
      expect(pacing.stopped).toBe(i === MESH_KEY_MAX_KEYS);
    }
  });

  it("stops at a refusal only a sign-in or an administrator lifts", () => {
    expect(paceAfter(freshPacing(), { kind: "not-live" }, 0).stopped).toBe(true);
    expect(paceAfter(freshPacing(), { kind: "not-enrolled" }, 0).stopped).toBe(true);
  });

  it("backs off on 409 and failures, capped, and honours a throttle", () => {
    const first = paceAfter(freshPacing(), { kind: "connected" }, 0);
    const second = paceAfter(first, { kind: "failed", error: "x" }, 0);
    expect([first.notBefore, second.notBefore]).toEqual([30_000, 60_000]);
    let many = second;
    for (let i = 0; i < 10; i++) many = paceAfter(many, { kind: "connected" }, 0);
    expect(many.notBefore).toBe(10 * 60_000);
    expect(paceAfter(freshPacing(), { kind: "throttled", retryAfterMs: 90_000 }, 5).notBefore).toBe(90_005);
  });
});
