import { describe, expect, it } from "vitest";
import type { RunEventFragment } from "@/reaktion/api/graphql";
import { latestEventPerSource } from "./latestEvents";

const ev = (source: string, t: number, id = `${source}-${t}`) =>
  ({ id, source, t, kind: "NEXT", handle: "", createdAt: "", causedBy: [] }) as unknown as RunEventFragment;

describe("latestEventPerSource", () => {
  it("keeps the latest per source, in first-seen order, and returns a matching map", () => {
    const { events, highestT, bySource } = latestEventPerSource([ev("a", 1), ev("b", 2), ev("a", 3), null]);
    expect(events.map((e) => e.id)).toEqual(["a-3", "b-2"]);
    expect(highestT).toBe(3);
    expect(bySource.get("a")?.id).toBe("a-3");
    expect([...bySource.values()]).toEqual(events);
  });

  it("ignores events after maxT", () => {
    const { events, bySource } = latestEventPerSource([ev("a", 1), ev("a", 5)], 2);
    expect(events.map((e) => e.id)).toEqual(["a-1"]);
    expect(bySource.size).toBe(1);
  });
});
