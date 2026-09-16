import { describe, expect, it } from "vitest";
import type { RecentRoomFragment } from "./api/graphql";
import { bucketFor, groupByBucket, rankRecentRooms, titleFromPrompt } from "./recentRooms";

const room = (
  id: string,
  createdAt: string,
  latestAt?: string,
  text = "hi",
): RecentRoomFragment => ({
  id,
  title: `Room ${id}`,
  createdAt,
  latest: latestAt ? [{ id: `m${id}`, text, createdAt: latestAt, attachedStructures: [] }] : [],
});

describe("recentRooms", () => {
  it("ranks by latest message, falling back to creation time", () => {
    const ranked = rankRecentRooms([
      room("1", "2026-09-01T10:00:00Z", "2026-09-15T10:00:00Z"),
      room("2", "2026-09-14T10:00:00Z"),
      room("3", "2026-09-10T10:00:00Z", "2026-09-16T08:00:00Z", "  latest  "),
    ]);
    expect(ranked.map((r) => r.id)).toEqual(["3", "1", "2"]);
    expect(ranked[0].preview).toBe("latest");
    expect(ranked[2].preview).toBeNull();
  });

  it("buckets by day", () => {
    const now = new Date(2026, 8, 16, 14);
    expect(bucketFor(new Date(2026, 8, 16, 1).getTime(), now)).toBe("Today");
    expect(bucketFor(new Date(2026, 8, 15, 23).getTime(), now)).toBe("Yesterday");
    expect(bucketFor(new Date(2026, 8, 11).getTime(), now)).toBe("This week");
    expect(bucketFor(new Date(2026, 7, 1).getTime(), now)).toBe("Earlier");
    const groups = groupByBucket(
      rankRecentRooms([
        room("a", new Date(2026, 8, 16, 9).toISOString()),
        room("b", new Date(2026, 7, 1).toISOString()),
      ]),
      now,
    );
    expect(groups.map((g) => g.bucket)).toEqual(["Today", "Earlier"]);
  });

  it("derives a title from the prompt", () => {
    expect(titleFromPrompt("  What is this cell?\nmore")).toBe("What is this cell?");
    expect(titleFromPrompt("")).toBe("New chat");
    expect(titleFromPrompt("x".repeat(80), 10)).toHaveLength(10);
  });
});
