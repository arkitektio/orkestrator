import { describe, expect, it } from "vitest";
import {
  ActionSlotMode,
  PlanItem,
  UPGRADE_SLACK,
  measurePlan,
  planActions,
} from "./actionPlan";

const item = (width: number, policy: PlanItem["policy"] = {}): PlanItem => ({ width, policy });

const plan = (
  items: PlanItem[],
  available: number,
  previous?: readonly ActionSlotMode[],
) => planActions({ items, available, gap: 4, menuWidth: 40, iconWidth: 28, previous });

describe("measurePlan", () => {
  it("charges gaps between drawn actions and the burger once", () => {
    const items = [item(100), item(100), item(100)];
    expect(measurePlan(items, ["row", "row", "row"], { gap: 4, menuWidth: 40, iconWidth: 28 })).toBe(
      308,
    );
    // 100 + 4 + 28 + 4 + 40
    expect(measurePlan(items, ["row", "icon", "menu"], { gap: 4, menuWidth: 40, iconWidth: 28 })).toBe(
      176,
    );
    expect(measurePlan(items, ["row", "hidden", "hidden"], { gap: 4, menuWidth: 40, iconWidth: 28 })).toBe(
      100,
    );
  });
});

describe("planActions", () => {
  it("leaves everything in the row when everything fits", () => {
    expect(plan([item(100), item(100), item(100)], 308)).toEqual(["row", "row", "row"]);
  });

  it("collapses from the right into the burger", () => {
    // 40 + 4+100 + 4+100 = 248 fits; all three in the row would be 308.
    expect(plan([item(100), item(100), item(100)], 250)).toEqual(["row", "row", "menu"]);
    expect(plan([item(100), item(100), item(100)], 100)).toEqual(["menu", "menu", "menu"]);
  });

  it("gives way in priority order, not in document order", () => {
    const items = [item(100, { priority: -10 }), item(100), item(100)];
    expect(plan(items, 250)).toEqual(["menu", "row", "row"]);
  });

  it("never degrades a pinned action, even when the row overflows", () => {
    const items = [item(100, { alwaysShow: true }), item(100, { alwaysShow: true })];
    expect(plan(items, 50)).toEqual(["row", "row"]);
  });

  it("steps an icon action through its glyph before the burger", () => {
    const items = [item(200, { alwaysShow: true }), item(100, { collapse: "icon" })];
    // 200 + 4 + 28 = 232 fits, so the label goes but the action stays.
    expect(plan(items, 232)).toEqual(["row", "icon"]);
    // Not even the glyph fits, and the pinned action will not give way.
    expect(plan(items, 230)).toEqual(["row", "menu"]);
  });

  it("drops a hiding action rather than listing it in the burger", () => {
    const items = [item(100), item(100, { collapse: "hide", priority: -1 })];
    expect(plan(items, 150)).toEqual(["row", "hidden"]);
  });

  it("holds its ground until an upgrade has room to spare", () => {
    const items = [item(100), item(100)];
    const tight: ActionSlotMode[] = ["row", "menu"];
    // 204 is exactly enough for both rows — too close to commit to.
    expect(plan(items, 204, tight)).toEqual(["row", "menu"]);
    expect(plan(items, 204 + UPGRADE_SLACK, tight)).toEqual(["row", "row"]);
  });

  it("degrades at once, without waiting for the margin", () => {
    const items = [item(100), item(100)];
    expect(plan(items, 200, ["row", "row"])).toEqual(["row", "menu"]);
  });
});
