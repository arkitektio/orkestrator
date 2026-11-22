import { describe, expect, it } from "vitest";

import { mergeProfileFeed, profileFeedHasMore } from "./feed";

type Item = { id: string; at?: string | null };

const source = (id: string) => ({
  id: id as `${string}.${string}`,
  itemKey: (item: unknown) => (item as Item).id,
  createdAt: (item: unknown) => (item as Item).at,
});

const MIKRO = source("mikro.data");
const ELEKTRO = source("elektro.experiments");

const keys = (entries: ReturnType<typeof mergeProfileFeed>) => entries.map((entry) => entry.key);

describe("mergeProfileFeed", () => {
  it("interleaves the sources newest first", () => {
    const merged = mergeProfileFeed(
      [
        { source: MIKRO, items: [{ id: "a", at: "2026-11-20T10:00:00Z" }, { id: "b", at: "2026-11-01T10:00:00Z" }] },
        { source: ELEKTRO, items: [{ id: "x", at: "2026-11-10T10:00:00Z" }] },
      ],
      10,
    );
    expect(keys(merged)).toEqual(["mikro.data:a", "elektro.experiments:x", "mikro.data:b"]);
  });

  it("cuts at the limit", () => {
    const merged = mergeProfileFeed(
      [
        { source: MIKRO, items: [{ id: "a", at: "2026-11-20T10:00:00Z" }, { id: "b", at: "2026-11-01T10:00:00Z" }] },
        { source: ELEKTRO, items: [{ id: "x", at: "2026-11-10T10:00:00Z" }] },
      ],
      2,
    );
    expect(keys(merged)).toEqual(["mikro.data:a", "elektro.experiments:x"]);
  });

  it("sorts items without a time last, keeping their order", () => {
    const merged = mergeProfileFeed(
      [{ source: MIKRO, items: [{ id: "none" }, { id: "bad", at: "never" }, { id: "dated", at: "2026-01-01T00:00:00Z" }] }],
      10,
    );
    expect(keys(merged)).toEqual(["mikro.data:dated", "mikro.data:none", "mikro.data:bad"]);
  });
});

describe("profileFeedHasMore", () => {
  it("is true only when a source filled its limit", () => {
    expect(profileFeedHasMore([{ items: [1, 2] }, { items: [1] }], 2)).toBe(true);
    expect(profileFeedHasMore([{ items: [1] }, { items: [] }], 2)).toBe(false);
  });
});
