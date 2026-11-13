import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/core/notify", () => ({ toast: { info: vi.fn() } }));

import { toast } from "@/core/notify";
import { offerManifestOnRefresh, refreshAccessToken } from "./auth";

const TOKEN = { access_token: "a", token_type: "Bearer", refresh_token: "r1", client_id: "client-1" };

const answer = (extra: Record<string, unknown> = {}) =>
  vi.fn(async (_url: string, _init?: RequestInit) =>
    new Response(JSON.stringify({ ...TOKEN, refresh_token: "r2", expires_in: 3600, ...extra }), { status: 200 }),
  );

const sent = (fetchMock: ReturnType<typeof answer>) =>
  new URLSearchParams(String(fetchMock.mock.calls[0][1]?.body));

afterEach(() => {
  offerManifestOnRefresh(null);
  vi.unstubAllGlobals();
  vi.mocked(toast.info).mockClear();
});

describe("a refresh says what the app is now", () => {
  it("sends nothing while there is no enhanced manifest", async () => {
    const fetchMock = answer();
    vi.stubGlobal("fetch", fetchMock);

    await refreshAccessToken("https://lok/o/token/", TOKEN);

    expect(sent(fetchMock).has("manifest")).toBe(false);
    expect(sent(fetchMock).get("client_id")).toBe("client-1");
  });

  it("sends the manifest it was given, and keeps the client id lok answers with", async () => {
    const fetchMock = answer();
    vi.stubGlobal("fetch", fetchMock);
    offerManifestOnRefresh(() => ({ identifier: "live.arkitekt.orkestrator", version: "6.2.0", node_id: "n1" }));

    const { token } = await refreshAccessToken("https://lok/o/token/", TOKEN);

    expect(JSON.parse(sent(fetchMock).get("manifest")!)).toMatchObject({ version: "6.2.0", node_id: "n1" });
    expect(token.client_id).toBe("client-1");
    expect(token.refresh_token).toBe("r2");
    expect(toast.info).not.toHaveBeenCalled();
  });

  it("asks for approval once when lok says the new version needs it", async () => {
    vi.stubGlobal("fetch", answer({ manifest_status: "approval_required" }));
    offerManifestOnRefresh(() => ({ version: "7.0.0" }));

    await refreshAccessToken("https://lok/o/token/", TOKEN);
    await refreshAccessToken("https://lok/o/token/", TOKEN);

    expect(toast.info).toHaveBeenCalledTimes(1);
  });

  it("asks per deployment, and offers the approval only where one can be started", async () => {
    vi.stubGlobal("fetch", answer({ manifest_status: "approval_required" }));
    const start = vi.fn();
    offerManifestOnRefresh(
      () => ({ version: "7.0.0" }),
      (endpoint) => (endpoint === "https://live/o/token/" ? start : undefined),
    );

    await refreshAccessToken("https://parked/o/token/", TOKEN);
    await refreshAccessToken("https://live/o/token/", TOKEN);

    expect(toast.info).toHaveBeenCalledTimes(2);
    expect(vi.mocked(toast.info).mock.calls[0][1]?.action).toBeUndefined();
    const action = vi.mocked(toast.info).mock.calls[1][1]?.action as { onClick: () => void };
    action.onClick();
    expect(start).toHaveBeenCalledTimes(1);
  });
});
