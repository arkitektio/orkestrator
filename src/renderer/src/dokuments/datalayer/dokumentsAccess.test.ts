// @vitest-environment jsdom
// (dokumentsAccess -> Arkitekt -> constants reads `window` on load)
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getDokumentsMediaUrl } from "./dokumentsAccess";

const grant = {
  accessKey: "AKIADOKUMENTS",
  secretKey: "dokuments-secret",
  sessionToken: "dokuments-session",
  expiresIn: 3600,
  region: "us-east-1",
  bucket: "media",
  prefix: "media/org-1",
};

const makeClient = () => ({
  mutate: vi.fn(async () => ({ data: { requestGeneralMediaAccess: grant } })),
});

describe("getDokumentsMediaUrl", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-22T10:15:00Z"));
  });

  it("signs every page of a document with one grant", async () => {
    const client = makeClient();
    const pages = Array.from({ length: 5 }, (_, index) => ({
      id: String(index),
      key: `media/org-1/page-${index}.png`,
      bucket: "media",
      path: `s3://media/media/org-1/page-${index}.png`,
    }));

    const urls = await Promise.all(
      pages.map((page) => getDokumentsMediaUrl(page, client as never, "https://datalayer.local")),
    );

    expect(client.mutate).toHaveBeenCalledTimes(1);
    expect(new Set(urls).size).toBe(pages.length);
    expect(urls[0]).toMatch(/^https:\/\/datalayer\.local\/media\/media\/org-1\/page-0\.png\?/);
    expect(urls[0]).toContain("X-Amz-Credential=AKIADOKUMENTS");
    expect(urls[0]).toContain("X-Amz-Security-Token=dokuments-session");
  });
});
