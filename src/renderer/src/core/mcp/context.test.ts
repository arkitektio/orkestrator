import { describe, expect, it } from "vitest";

import { McpRefusal, describeTabs, isPrivatePath, planLook, resolveOpen, structureAtPath, visibleViews } from "./context";

const models = [
  { identifier: "@mikro/image", path: "mikro/images" },
  { identifier: "@mikro/scene", path: "mikro/scenes" },
];
const privatePaths = ["/kuvert", "/bank"];

describe("structureAtPath", () => {
  it("reads a model's page as its structure", () => {
    expect(structureAtPath("/mikro/scenes/12?tab=layers", models)).toEqual({ identifier: "@mikro/scene", id: "12" });
  });

  it("is null for a list, a sub-page and an unknown route", () => {
    expect(structureAtPath("/mikro/scenes", models)).toBeNull();
    expect(structureAtPath("/mikro/scenes/12/register", models)).toBeNull();
    expect(structureAtPath("/settings/experiments", models)).toBeNull();
  });
});

describe("isPrivatePath", () => {
  it("matches a private module's pages and nothing that merely starts alike", () => {
    expect(isPrivatePath("/kuvert", privatePaths)).toBe(true);
    expect(isPrivatePath("/kuvert/threads/3?x=1", privatePaths)).toBe(true);
    expect(isPrivatePath("/bankers/1", privatePaths)).toBe(false);
  });
});

const tabs = [
  { id: "a", label: "HeLa s3", path: "/mikro/scenes/12" },
  { id: "b", label: "Inbox", path: "/kuvert/threads/3" },
];

describe("describeTabs", () => {
  it("says what a tab is about, and nothing about a private one", () => {
    expect(describeTabs(tabs, ["a"], "a", models, privatePaths)).toEqual([
      {
        label: "HeLa s3",
        path: "/mikro/scenes/12",
        structure: { identifier: "@mikro/scene", id: "12" },
        shown: true,
        focused: true,
        private: false,
      },
      { label: null, path: null, structure: null, shown: false, focused: false, private: true },
    ]);
  });
});

describe("visibleViews", () => {
  it("clips to the viewport, drops slivers, and puts the largest first", () => {
    const views = visibleViews(
      [
        { x: 10, y: 10, width: 32, height: 32 },
        { x: 900, y: 0, width: 400, height: 300 },
        { x: -50, y: 100, width: 850, height: 500 },
        { x: 2000, y: 0, width: 500, height: 500 },
      ],
      { width: 1000, height: 800 },
    );
    expect(views).toEqual([
      { x: 0, y: 100, width: 800, height: 500 },
      { x: 900, y: 0, width: 100, height: 300 },
    ]);
  });
});

describe("planLook", () => {
  const view = { x: 0, y: 40, width: 800, height: 600 };

  it("pictures the largest canvas for a view", () => {
    const plan = planLook("view", describeTabs(tabs, ["a"], "a", models, privatePaths), [view]);
    expect(plan).toEqual({ rect: view, subject: 'The largest canvas on "HeLa s3" (/mikro/scenes/12)' });
  });

  it("falls back to the window when there is no canvas, and says so", () => {
    const plan = planLook("view", describeTabs(tabs, ["a"], "a", models, privatePaths), []);
    expect(plan).toMatchObject({ rect: null });
    expect("subject" in plan && plan.subject).toContain("No canvas is on screen");
  });

  it("pictures nothing while a private page is on screen, even beside a scene", () => {
    const split = describeTabs(tabs, ["a", "b"], "a", models, privatePaths);
    expect(planLook("view", split, [view])).toHaveProperty("refused");
    expect(planLook("window", split, [view])).toHaveProperty("refused");
  });
});

describe("resolveOpen", () => {
  const build = (identifier: string, id: string) =>
    identifier === "@mikro/image" ? `mikro/images/${id}` : undefined;

  it("builds a structure's page", () => {
    expect(resolveOpen({ identifier: "@mikro/image", id: "5" }, build)).toBe("/mikro/images/5");
  });

  it("takes an app path as it is", () => {
    expect(resolveOpen({ path: "/mikro/scenes/12?tab=layers" }, build)).toBe("/mikro/scenes/12?tab=layers");
  });

  it("refuses what is not an app path, an unknown model and nothing at all", () => {
    expect(() => resolveOpen({ path: "https://example.com" }, build)).toThrow(McpRefusal);
    expect(() => resolveOpen({ path: "//example.com" }, build)).toThrow(McpRefusal);
    expect(() => resolveOpen({ identifier: "@nope/thing", id: "1" }, build)).toThrow(McpRefusal);
    expect(() => resolveOpen({}, build)).toThrow(McpRefusal);
  });
});
