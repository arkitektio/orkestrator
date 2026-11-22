import { describe, expect, it } from "vitest";
import type { RecentRoomFragment } from "./api/graphql";
import { bucketFor, groupByBucket, toRecentRooms, titleFromPrompt } from "./recentRooms";

const room = (
  id: string,
  createdAt: string,
  latestAt?: string,
  text = "hi",
): RecentRoomFragment => ({
  id,
  title: `Room ${id}`,
  createdAt,
  lastActivity: latestAt ?? createdAt,
  latest: latestAt ? [{ id: `m${id}`, text, createdAt: latestAt, attachedStructures: [] }] : [],
});

describe("recentRooms", () => {
  it("keeps the server's order and reads its last activity and the preview", () => {
    const rooms = toRecentRooms([
      room("3", "2026-09-10T10:00:00Z", "2026-09-16T08:00:00Z", "  latest  "),
      room("2", "2026-09-14T10:00:00Z"),
    ]);
    expect(rooms.map((r) => r.id)).toEqual(["3", "2"]);
    expect(rooms[0].lastActivity).toBe(new Date("2026-09-16T08:00:00Z").getTime());
    expect(rooms[0].preview).toBe("latest");
    expect(rooms[1].lastActivity).toBe(new Date("2026-09-14T10:00:00Z").getTime());
    expect(rooms[1].preview).toBeNull();
  });

  it("buckets by day", () => {
    const now = new Date(2026, 8, 16, 14);
    expect(bucketFor(new Date(2026, 8, 16, 1).getTime(), now)).toBe("Today");
    expect(bucketFor(new Date(2026, 8, 15, 23).getTime(), now)).toBe("Yesterday");
    expect(bucketFor(new Date(2026, 8, 11).getTime(), now)).toBe("This week");
    expect(bucketFor(new Date(2026, 7, 1).getTime(), now)).toBe("Earlier");
    const groups = groupByBucket(
      toRecentRooms([
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
