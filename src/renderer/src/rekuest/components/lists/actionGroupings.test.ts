// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { ActionKind, BrowseActionFragment } from "../../api/graphql";
import {
  ACTION_GROUP_KEYS,
  ACTION_GROUPINGS,
  getActionGrouping,
  UNCOLLECTED,
} from "./actionGroupings";

const action = (over: Partial<BrowseActionFragment>): BrowseActionFragment =>
  ({
    id: "a1",
    name: "Segment",
    kind: ActionKind.Function,
    app: { identifier: "napari" },
    implementations: [],
    collections: [],
    protocols: [],
    ...over,
  }) as BrowseActionFragment;

const meta = (id: string) => ({ id, title: id, count: 1 });

const sortGroups = (key: (typeof ACTION_GROUP_KEYS)[number], ids: string[]) => {
  const grouping = getActionGrouping(key)!;
  return ids.map(meta).sort(grouping.compareGroups).map((g) => g.id);
};

describe("action groupings", () => {
  it("offers 'none' plus every grouping as a URL value", () => {
    expect(ACTION_GROUP_KEYS).toEqual([
      "none",
      ...ACTION_GROUPINGS.map((g) => g.key),
    ]);
    expect(getActionGrouping("none")).toBeUndefined();
  });

  it("groups by app identifier", () => {
    const grouping = getActionGrouping("app")!;
    expect(grouping.getGroupId(action({}))).toBe("napari");
  });

  it("files an action under its first collection by name, once", () => {
    const grouping = getActionGrouping("collection")!;
    expect(
      grouping.getGroupId(
        action({
          collections: [
            { id: "2", name: "segmentation" },
            { id: "1", name: "acquisition" },
          ],
        }),
      ),
    ).toBe("acquisition");
    expect(grouping.getGroupId(action({}))).toBe(UNCOLLECTED);
  });

  it("keeps 'No collection' last", () => {
    expect(sortGroups("collection", [UNCOLLECTED, "b", "a"])).toEqual([
      "a",
      "b",
      UNCOLLECTED,
    ]);
  });

  it("orders availability from runnable to unimplemented", () => {
    expect(
      sortGroups("availability", ["none", "offline", "online", "recent"]),
    ).toEqual(["online", "recent", "offline", "none"]);
  });

  it("derives the availability group from CONNECTED agents", () => {
    const grouping = getActionGrouping("availability")!;
    expect(
      grouping.getGroupId(
        action({
          implementations: [
            {
              id: "i1",
              agent: { id: "ag", name: "lab", active: true, connected: true },
            },
          ],
        }),
      ),
    ).toBe("online");
    expect(grouping.getGroupId(action({}))).toBe("none");
  });
});
