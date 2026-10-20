// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { ActionKind, Effects, PortKind } from "@/fluss/api/graphql";
import { pythonFlowDeployConfig, pythonFlowToDefinition } from "../utils";
import { clearDraft, draftKey, readDraft, writeDraft } from "./draft";
import {
  aliasFor,
  ManifestRow,
  rowProblem,
  seedStructures,
  toManifestInput,
} from "./manifest";
import { callSnippet, parseStubs } from "./stubs";
import { aliasOfCall, callMarks } from "./trace";

const image = { key: "image", kind: PortKind.Structure, identifier: "@mikro/image", nullable: false };

const segment: ManifestRow = {
  alias: "segment",
  actionHash: "abc",
  effect: Effects.None,
  action: {
    id: "1",
    hash: "abc",
    name: "Segment image",
    kind: ActionKind.Function,
    key: "segment",
    version: "0.1",
    app: { identifier: "mikro-tools" },
    args: [
      { ...image, __typename: "ArgPort", label: "Image", widget: { kind: "SEARCH" } } as never,
      { key: "sigma", kind: PortKind.Float, nullable: true, default: 1.5 },
      { key: "labels", kind: PortKind.List, nullable: false, children: [{ key: "...", kind: PortKind.String, nullable: false }] },
    ],
    returns: [{ key: "return0", kind: PortKind.Structure, identifier: "@mikro/image", nullable: false, default: "x" } as never],
  },
};

describe("toManifestInput", () => {
  it("sends only what validation reads of a port, like fluss's _port", () => {
    const [entry] = toManifestInput([segment]);
    expect(entry).toEqual({
      alias: "segment",
      actionHash: "abc",
      kind: ActionKind.Function,
      effect: Effects.None,
      app: "mikro-tools",
      key: "segment",
      version: "0.1",
      args: [
        { key: "image", kind: PortKind.Structure, identifier: "@mikro/image", nullable: false },
        { key: "sigma", kind: PortKind.Float, nullable: true, default: 1.5 },
        { key: "labels", kind: PortKind.List, nullable: false, children: [{ key: "...", kind: PortKind.String, nullable: false }] },
      ],
      // A return port never carries a default.
      returns: [{ key: "return0", kind: PortKind.Structure, identifier: "@mikro/image", nullable: false }],
    });
  });

  it("leaves out rows whose action is not known", () => {
    expect(toManifestInput([{ ...segment, action: null, missing: true }])).toEqual([]);
  });
});

describe("seedStructures", () => {
  it("keeps the identifiers the flow uses that no action mentions", () => {
    const flowPorts = [image, { key: "table", kind: PortKind.Structure, identifier: "@mikro/table", nullable: false }];
    expect(seedStructures(flowPorts, [segment])).toEqual(["@mikro/table"]);
  });

  it("looks into children", () => {
    const flowPorts = [{ key: "many", kind: PortKind.List, children: [{ key: "...", kind: PortKind.Structure, identifier: "@kraph/graph" }] }];
    expect(seedStructures(flowPorts, [])).toEqual(["@kraph/graph"]);
  });
});

describe("aliasFor", () => {
  it("makes a free snake-case Python name", () => {
    expect(aliasFor("Segment Image", new Set())).toBe("segment_image");
    expect(aliasFor("segmentImage", new Set(["segment_image"]))).toBe("segment_image_2");
    expect(aliasFor("3D Render!", new Set())).toBe("a_3d_render");
    expect(aliasFor("import", new Set())).toBe("import_action");
    expect(aliasFor("", new Set())).toBe("action");
  });
});

describe("rowProblem", () => {
  it("names what would be refused", () => {
    expect(rowProblem(segment, [segment])).toBeNull();
    expect(rowProblem({ ...segment, alias: "1x" }, [])).toBe("Not a Python name");
    expect(rowProblem(segment, [segment, segment])).toBe("Used twice");
    expect(rowProblem({ ...segment, action: null, missing: true }, [])).toBe("Rekuest no longer knows this action");
    expect(rowProblem({ ...segment, action: { ...segment.action!, kind: ActionKind.Generator } }, [])).toBe(
      "Only function actions can be called",
    );
  });
});

describe("parseStubs", () => {
  const stubs = `from typing import Any

class MikroImage(str):
    """A @mikro/image (its ID)."""

async def segment(image: MikroImage, *, sigma: float = ..., labels: list[str]) -> tuple[MikroImage, int]: ...
async def count(items: dict[str, int]) -> int: ...
`;

  it("reads every action's signature and every structure class", () => {
    const parsed = parseStubs(stubs);
    expect(parsed.classes).toEqual([{ name: "MikroImage", base: "str", doc: "A @mikro/image (its ID)." }]);
    expect(parsed.functions.map((fn) => fn.name)).toEqual(["segment", "count"]);
    expect(parsed.functions[0].returns).toBe("tuple[MikroImage, int]");
    expect(parsed.functions[0].params).toEqual([
      { name: "image", annotation: "MikroImage", optional: false, keywordOnly: false },
      { name: "sigma", annotation: "float", optional: true, keywordOnly: true },
      { name: "labels", annotation: "list[str]", optional: false, keywordOnly: true },
    ]);
    // A comma inside brackets does not split a parameter.
    expect(parsed.functions[1].params).toHaveLength(1);
  });

  it("builds a call with the required parameters as tab stops", () => {
    expect(callSnippet(parseStubs(stubs).functions[0])).toBe("await segment(${1:image}, labels=${2:labels})");
  });

  it("is empty for no stubs", () => {
    expect(parseStubs(undefined)).toEqual({ functions: [], classes: [] });
  });
});

describe("pythonFlowToDefinition", () => {
  it("is fluss's python_flow_definition", () => {
    const definition = pythonFlowToDefinition({
      id: "7",
      title: "Segment",
      description: null,
      args: [{ __typename: "ArgPort", key: "image", kind: PortKind.Structure, identifier: "@mikro/image", nullable: false } as never],
      returns: [{ __typename: "ReturnPort", key: "return0", kind: PortKind.Int, nullable: false } as never],
    });
    expect(definition).toMatchObject({
      name: "Segment",
      key: "pythonflow_7",
      version: "1",
      kind: "FUNCTION",
      description: "The Python flow Segment",
      stateful: false,
      isDev: false,
    });
    expect(definition.args?.[0]).toMatchObject({ key: "image", identifier: "@mikro/image", kind: PortKind.Structure });
    expect(definition.returns?.[0]).toMatchObject({ key: "return0", kind: PortKind.Int });
    expect(pythonFlowDeployConfig("7")).toEqual({ bound: { flow: "7" }, args_key: "kwargs", returns_key: "returns" });
  });
});

describe("drafts", () => {
  it("round-trips and clears", () => {
    const id = draftKey("42");
    writeDraft(id, { source: "x", title: "T", manifest: [], structures: [] });
    expect(readDraft(id)?.source).toBe("x");
    clearDraft(id);
    expect(readDraft(id)).toBeNull();
    expect(draftKey(null)).toBe("fluss:pythonflow-draft:new");
  });
});

describe("callMarks", () => {
  const source = `async def main(image: MikroImage) -> int:
    masks = await asyncio.gather(segment(image), segment(image))
    # segment(image) in a comment is no call
    return await count(masks)
`;
  const manifest = [
    { alias: "segment", actionHash: "h-seg" },
    { alias: "count", actionHash: "h-count" },
  ];

  it("marks each line calling an alias with the state of that alias's calls", () => {
    const marks = callMarks(source, manifest, [
      { callKey: "segment:abc:0", latestEventKind: "YIELD" },
      { callKey: "segment:abc:1", latestEventKind: "PROGRESS" },
      { action: { hash: "h-count" }, latestEventKind: "FAILED" },
    ]);
    expect(marks).toEqual([
      { line: 2, tone: "running", hover: "**segment**: 2 calls · 1 done · 1 running" },
      { line: 4, tone: "failed", hover: "**count**: 1 call · 1 failed" },
    ]);
  });

  it("marks an alias not called yet as idle", () => {
    expect(callMarks(source, manifest, []).map((mark) => mark.tone)).toEqual(["idle", "idle"]);
  });

  it("reads the alias off the call key, else the action's hash", () => {
    const byHash = new Map([["h-seg", "segment"]]);
    expect(aliasOfCall({ callKey: "count:x:0" }, byHash)).toBe("count");
    expect(aliasOfCall({ action: { hash: "h-seg" } }, byHash)).toBe("segment");
    expect(aliasOfCall({}, byHash)).toBeNull();
  });
});
