import { PortKind } from "@/rekuest/api/graphql";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/core/smart/registry", () => ({
  smartRegistry: {
    getDisplayName: (identifier: string) => (identifier === "@mikro/image" ? "Image" : identifier),
  },
}));

import { portSpanClass } from "@/core/ports/widgets/gridColumns";
import { parseTag, parseTags } from "@/core/ports/widgets/fallbacks/TagListWidget";
import {
  choicePresentation,
  humanizeKey,
  isTagListPort,
  portDescription,
  portLabel,
  portPlaceholder,
  portSize,
} from "./portPresentation";
import { followFieldName } from "./useFollowValue";
import { recursiveExtract } from "./utils";

const port = (kind: PortKind, extra: Record<string, unknown> = {}) =>
  ({ key: "the_port", kind, nullable: false, ...extra }) as never;

const choices = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ value: `v${i}`, label: `Choice ${i}` }));

describe("port labels", () => {
  it("prefers the label, else reads the key as words", () => {
    expect(portLabel(port(PortKind.Int, { label: "Exposure" }))).toBe("Exposure");
    expect(portLabel(port(PortKind.Int, { key: "exposure_time" }))).toBe("Exposure time");
    expect(humanizeKey("exposureTimeMs")).toBe("Exposure time ms");
    expect(humanizeKey("z-step")).toBe("Z step");
  });
});

describe("port descriptions", () => {
  it("keeps the author's description", () => {
    expect(portDescription(port(PortKind.Int, { description: "How long" }))).toBe("How long");
  });

  it("says what the port takes when it has none", () => {
    expect(portDescription(port(PortKind.Int))).toBe("A whole number");
    expect(portDescription(port(PortKind.Float))).toBe("A number");
    expect(portDescription(port(PortKind.String))).toBe("A text");
    expect(portDescription(port(PortKind.Bool))).toBe("On or off");
    expect(portDescription(port(PortKind.Date))).toBe("A date and time");
    expect(portDescription(port(PortKind.Quantity, { referenceUnit: "ms" }))).toBe("A value in ms");
    expect(portDescription(port(PortKind.Enum, { choices: choices(4) }))).toBe("Pick one of 4 options");
    expect(portDescription(port(PortKind.Structure, { identifier: "@mikro/image" }))).toBe(
      "Select an image",
    );
    expect(
      portDescription(
        port(PortKind.List, { children: [port(PortKind.Structure, { identifier: "@mikro/image" })] }),
      ),
    ).toBe("One or more images");
    expect(portDescription(port(PortKind.List, { children: [port(PortKind.Int)] }))).toBe(
      "One or more numbers",
    );
  });

  it("marks optional ports and reads the widget", () => {
    expect(portDescription(port(PortKind.Int, { nullable: true }))).toBe("A whole number (optional)");
    expect(
      portDescription(port(PortKind.Float), { __typename: "SliderAssignWidget", min: 0, max: 10 }),
    ).toBe("A number between 0 and 10");
    expect(portDescription(port(PortKind.String), { __typename: "StringAssignWidget", asParagraph: true })).toBe(
      "A longer text",
    );
  });

  it("takes the widget's placeholder, through a custom widget's fallback too", () => {
    expect(portPlaceholder(port(PortKind.Enum))).toBe("Choose…");
    expect(portPlaceholder(port(PortKind.Enum), { __typename: "ChoiceAssignWidget", placeholder: "Mode" })).toBe(
      "Mode",
    );
    expect(
      portPlaceholder(port(PortKind.String), {
        __typename: "CustomAssignWidget",
        fallback: { __typename: "StringAssignWidget", placeholder: "Name it" },
      }),
    ).toBe("Name it");
  });
});

describe("port sizes", () => {
  it("packs small scalars and gives sub-forms the row", () => {
    expect(portSize(port(PortKind.Bool))).toBe("narrow");
    expect(portSize(port(PortKind.Int))).toBe("narrow");
    expect(portSize(port(PortKind.Int), { __typename: "SliderAssignWidget" })).toBe("medium");
    expect(portSize(port(PortKind.String))).toBe("medium");
    expect(portSize(port(PortKind.String), { __typename: "StringAssignWidget", asParagraph: true })).toBe("wide");
    expect(portSize(port(PortKind.Model))).toBe("full");
    expect(portSize(port(PortKind.Union))).toBe("full");
    expect(portSize(port(PortKind.List, { children: [port(PortKind.Int)] }))).toBe("wide");
    expect(portSize(port(PortKind.List, { children: [port(PortKind.Model)] }))).toBe("full");
  });

  it("sizes an enum by how its choices are shown", () => {
    expect(choicePresentation(3)).toBe("segmented");
    expect(choicePresentation(6)).toBe("select");
    expect(choicePresentation(20)).toBe("search");
    expect(choicePresentation(0)).toBe("search");
    expect(portSize(port(PortKind.Enum, { choices: choices(6) }))).toBe("narrow");
    expect(portSize(port(PortKind.Enum, { choices: choices(3) }))).toBe("medium");
  });

  it("has a static span class per size", () => {
    expect(portSpanClass("narrow")).toContain("col-span-1");
    expect(portSpanClass("full")).toContain("col-span-full");
  });
});

describe("tag lists", () => {
  it("are lists of bare texts or numbers", () => {
    expect(isTagListPort(port(PortKind.List, { children: [port(PortKind.String)] }))).toBe(true);
    expect(isTagListPort(port(PortKind.List, { children: [port(PortKind.Model)] }))).toBe(false);
    expect(
      isTagListPort(
        port(PortKind.List, { children: [port(PortKind.String, { widget: { __typename: "SearchAssignWidget" } })] }),
      ),
    ).toBe(false);
    expect(isTagListPort(port(PortKind.Int))).toBe(false);
  });

  it("parse what was typed into items of the list's kind", () => {
    expect(parseTag(" a b ", PortKind.String)).toBe("a b");
    expect(parseTag("3", PortKind.Int)).toBe(3);
    expect(parseTag("3.5", PortKind.Int)).toBeNull();
    expect(parseTag("3.5", PortKind.Float)).toBe(3.5);
    expect(parseTag("x", PortKind.Float)).toBeNull();
    expect(parseTags("1, 2 3", PortKind.Int)).toEqual([1, 2, 3]);
    expect(parseTags("red wine, white", PortKind.String)).toEqual(["red wine", "white"]);
  });

  it("store rows the list extraction already understands", () => {
    const list = port(PortKind.List, { children: [port(PortKind.Int)] });
    const rows = parseTags("1,2", PortKind.Int).map((value) => ({ __value: value }));
    expect(recursiveExtract(rows, list)).toEqual([1, 2]);
  });
});

describe("followValue", () => {
  it("resolves sibling, nested and absolute port paths to field names", () => {
    expect(followFieldName("a", ["args", "b"], ["args"])).toBe("args.a");
    expect(followFieldName("a..x", ["args", "b"], ["args"])).toBe("args.a.x");
    expect(followFieldName("/a", ["args", "model", "b"], ["args"])).toBe("args.a");
    expect(followFieldName("a", ["b"], [])).toBe("a");
  });

  it("follows nothing when unset or pointed at itself", () => {
    expect(followFieldName(null, ["b"], [])).toBeUndefined();
    expect(followFieldName("b", ["args", "b"], ["args"])).toBeUndefined();
  });
});
