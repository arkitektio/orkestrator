// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { defaultBlokCatalog } from "../renderer/catalog";
import { analyzeBsx } from "./analyze";
import { viewCatalog } from "./catalogView";
import { completeBsx, hoverBsx, scanCursor, signatureBsx, type BsxEnvironment } from "./language";
import { parseBsx } from "./parse";
import { checkBsxReferences, localRootsOf, type BsxDependency } from "./references";

const dependencies: BsxDependency[] = [
  { key: "stage", app: "stagecontrol", actions: ["move", "home"], states: ["position"] },
];

const env = (overrides: Partial<BsxEnvironment> = {}): BsxEnvironment => ({
  catalog: viewCatalog(defaultBlokCatalog),
  context: "HTML",
  dependencies,
  args: ["image"],
  ...overrides,
});

/** Completions at `|` in the source. */
const at = (marked: string, environment = env()) => {
  const offset = marked.indexOf("|");
  return completeBsx(marked.replace("|", ""), offset, environment);
};
const labels = (marked: string, environment = env()) => at(marked, environment).map((item) => item.label);

describe("scanCursor", () => {
  it("knows where the cursor is", () => {
    expect(scanCursor("<Car", 4)).toMatchObject({ kind: "tag", prefix: "Car" });
    expect(scanCursor("<Card><Butt", 11)).toMatchObject({ kind: "tag", prefix: "Butt", stack: [{ tag: "Card" }] });
    expect(scanCursor('<Card padding="2" ', 18)).toMatchObject({ kind: "attrName", tag: "Card", prefix: "" });
    expect(scanCursor('<Card pad', 9)).toMatchObject({ kind: "attrName", prefix: "pad" });
    expect(scanCursor('<Card padding="2', 16)).toMatchObject({ kind: "attrValue", attr: "padding", value: "2" });
    expect(scanCursor("<Card></Ca", 10)).toMatchObject({ kind: "close", prefix: "Ca", stack: [{ tag: "Card" }] });
    expect(scanCursor("<Card><Text /></Card>", 21)).toMatchObject({ kind: "text", stack: [] });
    expect(scanCursor("<!-- <Car", 9)).toEqual({ kind: "none" });
  });

  it("counts attributes written after the cursor as present", () => {
    const cursor = scanCursor('<Text  tone="muted" />', 6);
    expect(cursor.kind === "attrName" && [...cursor.present]).toEqual(["tone"]);
  });
});

describe("completeBsx", () => {
  it("offers components, with their required props filled in", () => {
    const button = at("<Card><Butt|").find((item) => item.label === "Button");
    expect(button?.insertText).toContain("</Button>");
    const selectItem = at("<Select><|").find((item) => item.label === "SelectItem");
    expect(selectItem?.insertText).toMatch(/^SelectItem value="\$\{1\}" \/>$/);
  });

  it("offers only what may sit where the cursor is", () => {
    expect(labels("<Scene><|")).toContain("Model");
    expect(labels("<Card><|")).not.toContain("Model");
    expect(labels("<Scene><Model><|")).toContain("OnClick");
    expect(labels("<Scene><|")).not.toContain("OnClick");
    expect(labels("<|", env({ context: "SCENE" }))).toEqual(["Scene"]);
    expect(labels("<Card><SelectItem><|")).toEqual([]);
  });

  it("offers the props not yet set, required first", () => {
    const items = labels('<SelectItem disabled="true" |');
    expect(items[0]).toBe("value");
    expect(items).not.toContain("disabled");
    expect(items).toContain("id");
    // A scene node's `id` prop is the node id BSX writes: offered once.
    expect(labels("<Model |").filter((label) => label === "id")).toHaveLength(1);
  });

  it("offers an enum's values", () => {
    expect(labels('<Text tone="|')).toEqual(["default", "muted", "destructive", "success"]);
  });

  it("offers what a value can name", () => {
    expect(labels('<Text text="@|')).toEqual(expect.arrayContaining(["stage", "args", "utils", "state"]));
    expect(labels('<Text text="@stage.|')).toEqual(["position", "assets"]);
    expect(labels('<Button onClick="@stage.|')).toEqual(["move", "home", "position", "assets"]);
    expect(labels('<Text text="@stagecontrol.|')).toEqual(["position", "assets"]);
    expect(labels('<Text text="@args.|')).toEqual(["image"]);
    expect(labels('<Text text="$state.stage.|')).toEqual(["position"]);
    expect(labels('<Text text="@stage.move.|')).toEqual(["latest"]);
    expect(labels('<Button onClick="@stage.move(x=|')).toEqual(expect.arrayContaining(["event", "True"]));
    expect(labels('<Button onClick="@stage.move().|')).toEqual(["into"]);
    expect(labels('<Button onClick="@stage.move().into(run)" /><Text text="@run.|')).toContain("running");
    expect(labels('<Button onClick="@stage.move(\'@|')).toEqual([]);
  });

  it("offers pure util functions in values, any in handlers", () => {
    const view = viewCatalog(defaultBlokCatalog);
    const effect = [...view.functions.values()].find((fn) => !fn.pure);
    const pure = [...view.functions.values()].find((fn) => fn.pure)!;
    expect(labels('<Text text="@utils.|')).toContain(pure.name);
    if (effect) {
      expect(labels('<Text text="@utils.|')).not.toContain(effect.name);
      expect(labels('<Button onClick="@utils.|')).toContain(effect.name);
    }
  });

  it("closes the open tag", () => {
    expect(at("<Card></|")).toMatchObject([{ insertText: "Card>" }]);
  });
});

describe("hover and signatures", () => {
  it("describes the component and prop under the cursor", () => {
    expect(hoverBsx('<Text tone="muted" />', 2, env())?.contents).toContain("<Text>");
    expect(hoverBsx('<Text tone="muted" />', 7, env())?.contents).toContain("**tone**");
  });

  it("says which parameter of a util call the cursor is on", () => {
    const view = viewCatalog(defaultBlokCatalog);
    const fn = [...view.functions.values()].find((candidate) => !candidate.variadic && candidate.params.length >= 2)!;
    const source = `<Text text="@utils.${fn.name}(a, `;
    const signature = signatureBsx(source, source.length, env());
    expect(signature?.label.startsWith(fn.name)).toBe(true);
    expect(signature?.activeParameter).toBe(1);
  });
});

describe("checkBsxReferences", () => {
  const check = (source: string, context = { dependencies, args: ["image"] }) =>
    checkBsxReferences(parseBsx(source).tree, context).map((finding) => finding.message);

  it("accepts what resolves", () => {
    expect(
      check(`<Card>
        <Text text="@stage.position.x" />
        <Text text="@args.image" />
        <Text text="@stage.assets.scope" />
        <Text text="@run.running" />
        <Button onClick="@stage.move(x=event.value).into(run)" />
        <foreach items="@stage.position" let="#item"><Text text="@item.x" /></foreach>
      </Card>`),
    ).toEqual([]);
  });

  it("finds what does not", () => {
    expect(check('<Text text="@lamp.on" />')[0]).toMatch(/Unknown reference 'lamp.on'/);
    expect(check('<Text text="@stage.speed" />')[0]).toMatch(/not a state of 'stage'/);
    expect(check('<Button onClick="@stage.fly()" />')[0]).toMatch(/not an action of 'stage'/);
    expect(check('<Text text="@args.scene" />')[0]).toMatch(/not an arg/);
    expect(check('<Text text="@item.x" />')[0]).toMatch(/Unknown reference/);
  });

  it("takes the demo state's own keys as the blok's state", () => {
    expect(localRootsOf(dependencies, { form: {}, stage: {} })).toEqual(["form"]);
    expect(check('<Text text="@form.selected" />', { dependencies, args: [], localRoots: ["form"] } as never)).toEqual([]);
  });
});

describe("analyzeBsx", () => {
  const analyze = (source: string, context: "HTML" | "SCENE" = "HTML") =>
    analyzeBsx(source, { catalog: defaultBlokCatalog, context, references: { dependencies, args: [] } });

  it("marks catalog errors at the prop", () => {
    const source = '<Text bogus="1" />';
    const { markers } = analyze(source);
    expect(markers).toHaveLength(1);
    expect(source.slice(markers[0].range.start, markers[0].range.end)).toBe("1");
  });

  it("marks a root the context does not take", () => {
    expect(analyze("<Card />", "SCENE").markers[0].message).toMatch(/root is <Scene>/);
  });

  it("returns no tree for text that does not parse", () => {
    expect(analyze("<Card>").tree).toBeNull();
  });
});
