import { describe, expect, it } from "vitest";
import logoFixture from "../renderer/bloks/logo/logo.fixture.json";
import sceneFixture from "../renderer/bloks/scene/scene.fixture.json";
import type { BlokComponentNode } from "../renderer/runtime/types";
import { parseBsx, parseBsxSafe } from "./parse";
import { BsxPrintError, printBsx } from "./print";
import { positionAt } from "./source";

/** The wire spells "nothing" as null or leaves it out; a tree is the same either way. */
const clean = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(clean);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      if (entry === null || entry === undefined) continue;
      if (Array.isArray(entry) && entry.length === 0 && (key === "props" || key === "children" || key === "arguments")) continue;
      out[key] = clean(entry);
    }
    return out;
  }
  return value;
};

const tree = (source: string) => parseBsx(source).tree;
const prop = (source: string, key: string) => tree(source).props?.find((candidate) => candidate.key === key);

describe("printBsx ∘ parseBsx", () => {
  it.each([
    ["scene", sceneFixture],
    ["logo", logoFixture],
  ])("round-trips the %s fixture", (_, fixture) => {
    for (const root of fixture as BlokComponentNode[]) {
      const printed = printBsx(root);
      expect(clean(tree(printed))).toEqual(clean(root));
      // Printing is stable: what it parses into prints the same.
      expect(printBsx(tree(printed))).toBe(printed);
    }
  });

  it("prints a node's id only where it differs from its structural one", () => {
    const printed = printBsx(tree('<Card><Button text="a" /><Button id="go" text="b" /></Card>'));
    expect(printed).toBe('<Card>\n  <Button text="a" />\n  <Button id="go" text="b" />\n</Card>');
  });

  it("breaks an element whose attributes do not fit on one line", () => {
    const long = "x".repeat(90);
    expect(printBsx(tree(`<Text text="${long}" variant="muted" />`))).toBe(
      `<Text\n  text="${long}"\n  variant="muted"\n/>`,
    );
  });

  it("refuses what BSX cannot spell", () => {
    const node = (props: BlokComponentNode["props"]): BlokComponentNode => ({ id: "Text", component: "Text", props });
    expect(() => printBsx(node([{ key: "count", static_value: 3 }]))).toThrow(BsxPrintError);
    expect(() => printBsx(node([{ key: "text", static_value: "@self.x" }]))).toThrow(/read as an expression/);
    expect(() => printBsx(node([{ key: "text", static_value: " padded" }]))).toThrow(/whitespace/);
    expect(() => printBsx(node([{ key: "text", dynamic_value: { path: "self.x", literal: "y" } }]))).toThrow(/fallback literal/);
    expect(() => printBsx(node([{ key: "text", dynamic_value: { path: "items.0" } }]))).toThrow(/not a name/);
  });
});

describe("parseBsx", () => {
  it("parses the mikro scene example", () => {
    const root = tree(`
      <MikroScene value="@args.scene" bind="form.selected"
        onAnnotation="@self.segment(scene=args.scene, path=event.annotation, lens=event.lens).into(run)">
        <MikroSceneViewport height="36rem" />
        <MikroSceneLayers />
      </MikroScene>`);
    expect(clean(root)).toEqual({
      id: "MikroScene",
      component: "MikroScene",
      props: [
        { key: "value", dynamic_value: { path: "args.scene" } },
        { key: "bind", static_value: "form.selected" },
        {
          key: "onAnnotation",
          declares_value: "run",
          agent_call: {
            dependency: "self",
            operation: "segment",
            arguments: [
              { key: "scene", value_path: "args.scene" },
              { key: "path", value_path: "$event.annotation" },
              { key: "lens", value_path: "$event.lens" },
            ],
          },
        },
      ],
      children: [
        { id: "MikroScene/MikroSceneViewport[0]", component: "MikroSceneViewport", props: [{ key: "height", static_value: "36rem" }] },
        { id: "MikroScene/MikroSceneLayers[0]", component: "MikroSceneLayers" },
      ],
    });
  });

  it("reads each kind of value", () => {
    expect(prop('<A v="$state.stage.position.x" />', "v")).toEqual({ key: "v", dynamic_value: { path: "stage.position.x" } });
    expect(prop('<A v="@mikro/image" />', "v")).toEqual({ key: "v", static_value: "@mikro/image" });
    expect(prop('<A v="  plain  " />', "v")).toEqual({ key: "v", static_value: "plain" });
    expect(prop('<A v="#fff" />', "v")).toEqual({ key: "v", static_value: "#fff" });
    expect(prop('<foreach items="@self.items" let="#item" />', "let")).toEqual({
      key: "let",
      static_value: "item",
      declares_value: "item",
    });
    expect(prop('<A v="@actions.stage.move(1, -2.5, fast=True)" />', "v")).toEqual({
      key: "v",
      agent_call: {
        dependency: "stage",
        operation: "move",
        arguments: [
          { key: "0", value_literal: 1 },
          { key: "1", value_literal: -2.5 },
          { key: "fast", value_literal: true },
        ],
      },
    });
    expect(prop(`<A v="@utils.format('{} µm', [x, 2], {'a': event})" />`, "v")).toEqual({
      key: "v",
      util_call: {
        operation: "format",
        arguments: [
          { key: "0", value_literal: "{} µm" },
          { key: "1", value_list: [{ value_path: "x" }, { value_literal: 2 }] },
          { key: "2", value_dict: [{ key: "a", value_path: "$event" }] },
        ],
      },
    });
  });

  it("decodes entities and folds whitespace in attribute values", () => {
    expect(prop(`<A v='{"a": 1}' w="a&amp;b&#10;c" />`, "v")).toEqual({ key: "v", static_value: '{"a": 1}' });
    expect(prop(`<A v='{"a": 1}' w="a&amp;b&#10;c" />`, "w")).toEqual({ key: "w", static_value: "a&b\nc" });
    expect(prop('<A w="a\n  b" />', "w")).toEqual({ key: "w", static_value: "a   b" });
  });

  it.each([
    ["<Badge>hello</Badge>", /Text content is not rendered/],
    ['<A v="@go()" />', /dependency key/],
    ['<A v="@utils.now().into(run)" />', /a utils call returns at once/],
    ['<A v="@self.go(x=None)" />', /cannot be None/],
    ['<A v="@a + b" />', /not supported/],
    ['<A v="$stage.x" />', /Invalid state namespace/],
    ['<foreach let="item" />', /loop variable/],
    ['<A v="@self.go(a=1, 2)" />', /Positional argument follows keyword/],
    ["<A><B></A>", /Mismatched tag/],
    ["<A /><B />", /one root/],
    ['<A v="1" v="2" />', /Duplicate attribute/],
  ])("refuses %s", (source, message) => {
    const result = parseBsxSafe(source);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).toMatch(message);
  });

  it("says where it failed", () => {
    const source = '<Card>\n  <Button text="ok" onClick="@self.go(" />\n</Card>';
    const result = parseBsxSafe(source);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(positionAt(source, result.error.range.start).line).toBe(2);
  });

  it("maps each node and prop to its source", () => {
    const source = '<Card>\n  <Button text="ok" />\n</Card>';
    const { sources } = parseBsx(source);
    const button = sources.get("Card/Button[0]")!;
    expect(source.slice(button.tagRange.start, button.tagRange.end)).toBe("Button");
    const text = button.props.get("text")!;
    expect(source.slice(text.valueRange.start, text.valueRange.end)).toBe("ok");
  });
});
