// @vitest-environment jsdom
// (kraphAccess -> Arkitekt -> constants reads `window` on load)
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getKraphMediaUrl } from "./kraphAccess";

const grant = {
  accessKey: "AKIAKRAPH",
  secretKey: "kraph-secret",
  sessionToken: "kraph-session",
  expiresIn: 3600,
  region: "us-east-1",
  bucket: "kraph-media",
};

const makeClient = () => ({
  mutate: vi.fn(async () => ({ data: { requestGeneralMediaAccess: grant } })),
});

describe("getKraphMediaUrl", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-02T10:15:00Z"));
  });

  it("requests one grant per session and signs each object in the client", async () => {
    const client = makeClient();
    const media = { id: "1", key: "images/a.png", bucket: "kraph-media" };
    const first = await getKraphMediaUrl(media, client as never, "https://datalayer.local");
    const second = await getKraphMediaUrl(
      { id: "2", key: "images/b.png", bucket: "kraph-media" },
      client as never,
      "https://datalayer.local",
    );

    expect(client.mutate).toHaveBeenCalledTimes(1);
    expect(first).toMatch(/^https:\/\/datalayer\.local\/kraph-media\/images\/a\.png\?/);
    expect(first).toContain("X-Amz-Credential=AKIAKRAPH");
    expect(first).toContain("X-Amz-Security-Token=kraph-session");
    expect(second).not.toBe(first);
    expect(await getKraphMediaUrl(media, client as never, "https://datalayer.local")).toBe(first);
  });
});
