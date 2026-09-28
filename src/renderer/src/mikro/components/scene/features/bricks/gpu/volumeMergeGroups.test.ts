import { describe, expect, it } from "vitest";
import {
  MAX_MERGED_MEMBERS,
  MERGE_MAX_SLOTS,
  findMergeGroup,
  planVolumeMergeGroups,
  type MergeMember,
} from "./volumeMergeGroups";

const member = (over: Partial<MergeMember> & { layerId: string }): MergeMember => ({
  order: 0,
  affineKey: "I",
  sourceCount: 1,
  cursorCount: 0,
  targetLevel: 0,
  ...over,
});

/** The reported case: four one-channel layers over one image, same transform. */
const fourChannels = (): MergeMember[] =>
  ["139", "140", "141", "142"].map((layerId, order) => member({ layerId, order }));

describe("planVolumeMergeGroups — the common case", () => {
  it("collapses four co-pool one-channel layers into a single pass", () => {
    const groups = planVolumeMergeGroups(fourChannels());
    expect(groups).toHaveLength(1);
    expect(groups[0].memberIds).toEqual(["139", "140", "141", "142"]);
    expect(groups[0].primaryId).toBe("139");
  });

  it("assigns contiguous, non-overlapping slot offsets in scene order", () => {
    const groups = planVolumeMergeGroups([
      member({ layerId: "a", order: 0, sourceCount: 2 }),
      member({ layerId: "b", order: 1, sourceCount: 3 }),
      member({ layerId: "c", order: 2, sourceCount: 1 }),
    ]);
    expect(groups[0].slotOffsets).toEqual({ a: 0, b: 2, c: 5 });
  });

  it("elects the lowest-scene-order member as primary, regardless of input order", () => {
    const shuffled = [
      member({ layerId: "c", order: 2 }),
      member({ layerId: "a", order: 0 }),
      member({ layerId: "b", order: 1 }),
    ];
    expect(planVolumeMergeGroups(shuffled)[0].primaryId).toBe("a");
  });

  it("is a deterministic function of its input", () => {
    const first = planVolumeMergeGroups(fourChannels());
    const second = planVolumeMergeGroups([...fourChannels()].reverse());
    expect(second).toEqual(first);
  });

  it("takes the FINEST target level across members", () => {
    // Residency is shared and the shader walks coarser from the desired level,
    // so the min is the finest data actually resident.
    const groups = planVolumeMergeGroups([
      member({ layerId: "a", order: 0, targetLevel: 2 }),
      member({ layerId: "b", order: 1, targetLevel: 0 }),
      member({ layerId: "c", order: 2, targetLevel: 1 }),
    ]);
    expect(groups[0].targetLevel).toBe(0);
  });

  it("reproduces today's shape for a lone layer", () => {
    const groups = planVolumeMergeGroups([member({ layerId: "solo" })]);
    expect(groups).toEqual([
      {
        primaryId: "solo",
        memberIds: ["solo"],
        targetLevel: 0,
        slotOffsets: { solo: 0 },
      },
    ]);
  });

  it("returns nothing for no members", () => {
    expect(planVolumeMergeGroups([])).toEqual([]);
  });
});

describe("planVolumeMergeGroups — splits", () => {
  it("splits on the world transform: one pass rasterizes one box", () => {
    const groups = planVolumeMergeGroups([
      member({ layerId: "a", order: 0, affineKey: "I" }),
      member({ layerId: "b", order: 1, affineKey: "shifted" }),
      member({ layerId: "c", order: 2, affineKey: "I" }),
    ]);
    expect(groups).toHaveLength(2);
    expect(findMergeGroup(groups, "a")?.memberIds).toEqual(["a", "c"]);
    expect(findMergeGroup(groups, "b")?.memberIds).toEqual(["b"]);
  });

  it("splits when the slot budget would overflow", () => {
    // 4 layers x 8 channels = 32 slots against a 16-slot budget → two halves.
    const groups = planVolumeMergeGroups(
      ["a", "b", "c", "d"].map((layerId, order) =>
        member({ layerId, order, sourceCount: 8 }),
      ),
    );
    expect(groups).toHaveLength(2);
    expect(groups[0].memberIds).toEqual(["a", "b"]);
    expect(groups[1].memberIds).toEqual(["c", "d"]);
    // Offsets restart per group — each group owns its own uniform arrays.
    expect(groups[0].slotOffsets).toEqual({ a: 0, b: 8 });
    expect(groups[1].slotOffsets).toEqual({ c: 0, d: 8 });
    for (const group of groups) {
      const used = Object.values(group.slotOffsets).reduce((a, b) => Math.max(a, b), 0) + 8;
      expect(used).toBeLessThanOrEqual(MERGE_MAX_SLOTS);
    }
  });

  it("splits when the cursor budget would overflow", () => {
    // 8 + 8 exactly fills the 16-cursor budget; the third member starts a group.
    const groups = planVolumeMergeGroups(
      ["a", "b", "c"].map((layerId, order) => member({ layerId, order, cursorCount: 8 })),
    );
    expect(groups.map((g) => g.memberIds)).toEqual([["a", "b"], ["c"]]);
  });

  it("does not merge two members whose cursors alone would overflow", () => {
    const groups = planVolumeMergeGroups(
      ["a", "b"].map((layerId, order) => member({ layerId, order, cursorCount: 10 })),
    );
    expect(groups.map((g) => g.memberIds)).toEqual([["a"], ["b"]]);
  });

  it("splits at the member ceiling even when the budgets have room", () => {
    const many = Array.from({ length: MAX_MERGED_MEMBERS + 1 }, (_, i) =>
      member({ layerId: `l${i}`, order: i, sourceCount: 1 }),
    );
    const groups = planVolumeMergeGroups(many);
    expect(groups).toHaveLength(2);
    expect(groups[0].memberIds).toHaveLength(MAX_MERGED_MEMBERS);
    expect(groups[1].memberIds).toEqual([`l${MAX_MERGED_MEMBERS}`]);
  });

  it("gives an over-budget member its own group rather than dropping it", () => {
    // The uniform builder truncates past MAX_CHANNELS, exactly as the
    // single-layer path already does — but the layer must still render.
    const groups = planVolumeMergeGroups([
      member({ layerId: "small", order: 0, sourceCount: 2 }),
      member({ layerId: "huge", order: 1, sourceCount: 99 }),
      member({ layerId: "after", order: 2, sourceCount: 2 }),
    ]);
    expect(findMergeGroup(groups, "huge")?.memberIds).toEqual(["huge"]);
    expect(findMergeGroup(groups, "small")?.memberIds).toEqual(["small"]);
    expect(findMergeGroup(groups, "after")?.memberIds).toEqual(["after"]);
  });

  it("covers every member exactly once, across every split reason", () => {
    const members = [
      member({ layerId: "a", order: 0, sourceCount: 6 }),
      member({ layerId: "b", order: 1, sourceCount: 6, affineKey: "other" }),
      member({ layerId: "c", order: 2, sourceCount: 6 }),
      member({ layerId: "d", order: 3, sourceCount: 6 }),
      member({ layerId: "e", order: 4, sourceCount: 6, affineKey: "other" }),
    ];
    const groups = planVolumeMergeGroups(members);
    const seen = groups.flatMap((g) => g.memberIds);
    expect([...seen].sort()).toEqual(["a", "b", "c", "d", "e"]);
    expect(seen).toHaveLength(new Set(seen).size);
    // Every group's primary is one of its own members.
    for (const group of groups) expect(group.memberIds).toContain(group.primaryId);
  });
});

describe("findMergeGroup", () => {
  it("returns null for a layer in no group", () => {
    expect(findMergeGroup(planVolumeMergeGroups(fourChannels()), "999")).toBeNull();
  });
});
