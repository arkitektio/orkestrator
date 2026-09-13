import { describe, expect, it } from "vitest";
import {
  datasetResident,
  edge,
  graphFromSpaces,
  keyEdge,
  lens,
  lineage,
  lineageDataset,
  lineageEdge,
  mesh,
  owner,
  space,
  stagedAnnotations,
  stagedIntensity,
  stagedLabel,
  stagedMesh,
  stagedNetwork,
  stagedPoints,
  table,
} from "./__fixtures__/lineage";
import {
  CHANNEL_CYCLE,
  inferLensKinds,
  relationToScene,
  stagedFromLayers,
  suggestLensKinds,
  suggestTableKinds,
  type Capabilities,
} from "./engine";
import { datasetKey, graphFromLineage, mergeGraphs, type DerivationGraph } from "./spaceGraph";

const caps = (drawable: string[], labels: string[] = []): Capabilities => ({
  drawable: new Set(drawable),
  labels: new Set(labels),
});

const rulesOf = (suggestion: { evidence: { rule: string }[] }) =>
  suggestion.evidence.map((item) => item.rule);

/** raw --CATEGORIZED--> mask, plus whatever else the test stages. */
const rawAndMask = (extra: Parameters<typeof graphFromSpaces>[0] = []): DerivationGraph =>
  graphFromSpaces([
    space("grid-raw", [lens("l-raw", "raw", { name: "dapi.zarr" })]),
    space("grid-mask", [
      lens("l-mask", "mask", {
        name: "cells.zarr",
        derivedFrom: [edge("seg", "grid-mask", "grid-raw", { valueRelation: "CATEGORIZED" })],
      }),
    ]),
    ...extra,
  ]);

describe("inferLensKinds (the gate)", () => {
  it("offers a phasor before a volume when the lens has a phasor axis", () => {
    const flim = lens("l1", "d", { axisNames: ["tau", "z", "y", "x"], shape: [64, 5, 64, 64], z: "z", phasor: "tau" });
    expect(inferLensKinds(flim, caps(["l1"]))).toEqual(["PHASOR", "VOLUME", "INTENSITY"]);
  });

  it("offers no phasor when the lens is not drawable", () => {
    const flim = lens("l1", "d", { axisNames: ["tau", "y", "x"], shape: [64, 64, 64], phasor: "tau" });
    expect(inferLensKinds(flim, caps([]))).toEqual([]);
  });
});

describe("suggestLensKinds — gate versus ordering", () => {
  it("keeps INTENSITY leading when the lineage says mask but the server does not", () => {
    const graph = rawAndMask();
    const mask = lens("l-mask", "mask", { derivedFrom: [edge("seg", "grid-mask", "grid-raw", { valueRelation: "CATEGORIZED" })] });
    const result = suggestLensKinds(graph, mask, caps(["l-mask"], []));

    expect(result.kinds).toEqual(["INTENSITY"]);
    expect(result.notes.map((note) => note.rule)).toContain("upstream-categorized");
    expect(result.notes.find((note) => note.rule === "upstream-categorized")?.summary).toBe(
      "Segmented from dapi.zarr",
    );
  });

  it("leads with a confirmed LABEL and explains it from the lineage and the keyed table", () => {
    const graph = rawAndMask([
      space("space-objects", [
        table("objects", { name: "objects.parquet", derivedFrom: [keyEdge("key", "grid-mask", "space-objects")] }),
      ]),
    ]);
    const mask = lens("l-mask", "mask");
    const result = suggestLensKinds(graph, mask, caps(["l-mask"], ["l-mask"]));

    expect(result.kinds).toEqual(["LABEL", "INTENSITY"]);
    const label = result.suggestions[0];
    expect(rulesOf(label)).toEqual(["server-label", "upstream-categorized", "keyed-by-table"]);
    expect(label.evidence[2].via?.name).toBe("objects.parquet");
    expect(label.score).toBeCloseTo(1 + 0.6 + 0.5);
  });

  it("pins an unconfirmed LABEL last whatever the lineage scores", () => {
    const graph = rawAndMask();
    const result = suggestLensKinds(graph, lens("l-mask", "mask"), null);
    expect(result.kinds).toEqual(["INTENSITY", "LABEL"]);
    expect(rulesOf(result.suggestions[1])).toContain("label-unconfirmed");
  });
});

describe("suggestLensKinds — the upstream walk", () => {
  const cropOfMask = () =>
    graphFromSpaces([
      space("grid-raw", [datasetResident("raw", { name: "dapi.zarr" })]),
      space("grid-mask", [
        datasetResident("mask", {
          name: "cells.zarr",
          derivedFrom: [edge("seg", "grid-mask", "grid-raw", { valueRelation: "CATEGORIZED" })],
        }),
      ]),
      space("grid-crop", [
        lens("l-crop", "crop", {
          name: "crop.zarr",
          derivedFrom: [edge("cut", "grid-crop", "grid-mask", { kind: "TRANSLATION", valueRelation: "IDENTICAL" })],
        }),
      ]),
    ]);

  it("passes IDENTICAL through at full weight and names the path", () => {
    const result = suggestLensKinds(cropOfMask(), lens("l-crop", "crop"), caps(["l-crop"], ["l-crop"]));
    const categorized = result.suggestions[0].evidence.find((e) => e.rule === "upstream-categorized")!;
    expect(categorized.weight).toBeCloseTo(0.6);
    expect(categorized.summary).toBe("Segmented from dapi.zarr (through a crop of cells.zarr)");
  });

  it("trusts an unstated relation less", () => {
    const graph = cropOfMask();
    graph.edges.get("cut")!.valueRelation = null;
    const result = suggestLensKinds(graph, lens("l-crop", "crop"), caps(["l-crop"], ["l-crop"]));
    const categorized = result.suggestions[0].evidence.find((e) => e.rule === "upstream-categorized")!;
    expect(categorized.weight).toBeCloseTo(0.36);
  });

  it("stops at TRANSFORMED: a distance map of a mask is an intensity", () => {
    const graph = cropOfMask();
    graph.edges.get("cut")!.valueRelation = "TRANSFORMED";
    const result = suggestLensKinds(graph, lens("l-crop", "crop"), caps(["l-crop"]));
    expect(result.kinds).toEqual(["INTENSITY"]);
    expect(rulesOf(result.suggestions[0])).toContain("upstream-transformed");
    expect(result.notes.map((n) => n.rule)).not.toContain("upstream-categorized");
  });

  it("notes an unreachable parent until the lineage answers, then resolves", () => {
    const oneHop = graphFromSpaces([
      space("grid-mask", [
        lens("l-mask", "mask", {
          derivedFrom: [edge("seg", "grid-mask", "grid-far", { valueRelation: "CATEGORIZED" })],
        }),
      ]),
    ]);
    const before = suggestLensKinds(oneHop, lens("l-mask", "mask"), caps(["l-mask"], ["l-mask"]));
    expect(before.resolved).toBe(false);
    expect(before.notes.map((n) => n.rule)).toContain("parent-unresolved");
    expect(rulesOf(before.suggestions[0])).not.toContain("upstream-categorized");

    const deep = graphFromLineage(
      lineage(
        "grid-mask",
        [lineageDataset("far", { name: "dapi.zarr" })],
        [lineageEdge(edge("seg", "grid-mask", "grid-far", { valueRelation: "CATEGORIZED" }), [owner("ArrayDataset", "mask")], [owner("ArrayDataset", "far")])],
      ),
    );
    const after = suggestLensKinds(mergeGraphs(oneHop, deep), lens("l-mask", "mask"), caps(["l-mask"], ["l-mask"]));
    expect(after.resolved).toBe(true);
    expect(after.notes.map((n) => n.rule)).not.toContain("parent-unresolved");
    expect(rulesOf(after.suggestions[0])).toContain("upstream-categorized");
  });
});

describe("suggestLensKinds — downstream witnesses", () => {
  it("reads a measurement table, a mesh and a segmentation off the children", () => {
    const graph = rawAndMask([
      space("space-t", [table("t", { name: "areas", derivedFrom: [edge("m", "space-t", "grid-mask", { kind: "UNMAPPABLE" })] })]),
      space("space-m", [mesh("m", { derivedFrom: [edge("mesh", "space-m", "grid-mask", { kind: "SCALE" })] })]),
    ]);

    const mask = suggestLensKinds(graph, lens("l-mask", "mask"), caps(["l-mask"], ["l-mask"]));
    expect(rulesOf(mask.suggestions[0])).toEqual([
      "server-label",
      "upstream-categorized",
      "measured-into-table",
      "meshed-from",
    ]);

    const raw = suggestLensKinds(graph, lens("l-raw", "raw"), caps(["l-raw"]));
    expect(raw.kinds).toEqual(["INTENSITY"]);
    expect(rulesOf(raw.suggestions[0])).toEqual(["drawable", "segmented-into"]);
    expect(raw.suggestions[0].evidence[1].via?.name).toBe("cells.zarr");
  });
});

describe("suggestLensKinds — structure and ingest", () => {
  it("leads with RGB from a PNG source, and only with three channels", () => {
    const graph = graphFromSpaces([
      space("grid-p", [lens("l-p", "p", { contentTypes: ["image/png"] })]),
    ]);
    const three = lens("l-p", "p", { axisNames: ["c", "y", "x"], shape: [3, 64, 64], intensity: "c", contentTypes: ["image/png"] });
    expect(suggestLensKinds(graph, three, caps(["l-p"])).kinds).toEqual(["RGB", "INTENSITY"]);

    const one = lens("l-p", "p", { contentTypes: ["image/png"] });
    const result = suggestLensKinds(graph, one, caps(["l-p"]));
    expect(result.kinds).toEqual(["INTENSITY"]);
    expect(result.notes.map((n) => n.rule)).toContain("rgb-source-file");
  });

  it("finds the PNG through an IDENTICAL crop", () => {
    const graph = graphFromSpaces([
      space("grid-p", [datasetResident("p", { name: "photo.zarr", contentTypes: ["image/jpeg"] })]),
      space("grid-c", [
        lens("l-c", "c", { derivedFrom: [edge("cut", "grid-c", "grid-p", { kind: "TRANSLATION", valueRelation: "IDENTICAL" })] }),
      ]),
    ]);
    const crop = lens("l-c", "c", { axisNames: ["c", "y", "x"], shape: [3, 64, 64], intensity: "c" });
    const result = suggestLensKinds(graph, crop, caps(["l-c"]));
    expect(result.kinds[0]).toBe("RGB");
    expect(result.suggestions[0].evidence[0].summary).toBe("Read out of a JPEG file, via photo.zarr");
  });

  it("never leads with RGB on three unlabelled channels", () => {
    const graph = graphFromSpaces([space("grid-d", [lens("l", "d")])]);
    const three = lens("l", "d", { axisNames: ["c", "y", "x"], shape: [3, 64, 64], intensity: "c" });
    expect(suggestLensKinds(graph, three, caps(["l"])).kinds).toEqual(["INTENSITY", "RGB"]);
  });

  it("leads with a phasor over a volume, and a vector over everything raster", () => {
    const graph = graphFromSpaces([space("grid-d", [lens("l", "d")])]);
    const flim = lens("l", "d", { axisNames: ["tau", "z", "y", "x"], shape: [64, 5, 64, 64], z: "z", phasor: "tau" });
    expect(suggestLensKinds(graph, flim, caps(["l"])).kinds).toEqual(["PHASOR", "VOLUME", "INTENSITY"]);

    const field = lens("l", "d", { axisNames: ["v", "y", "x"], shape: [2, 64, 64], vector: "v" });
    expect(suggestLensKinds(graph, field, caps(["l"])).kinds).toEqual(["VECTOR"]);
  });

  it("does not call a single-plane stack a volume", () => {
    const graph = graphFromSpaces([space("grid-d", [lens("l", "d")])]);
    const flat = lens("l", "d", { axisNames: ["z", "y", "x"], shape: [1, 64, 64], z: "z" });
    expect(suggestLensKinds(graph, flat, caps(["l"])).kinds).toEqual(["INTENSITY"]);
  });
});

describe("defaults", () => {
  const multichannel = (id: string, datasetId: string, extra = {}) =>
    lens(id, datasetId, { axisNames: ["c", "y", "x"], shape: [3, 64, 64], intensity: "c", ...extra });

  it("styles a single channel grey and normal", () => {
    const graph = graphFromSpaces([space("grid-d", [lens("l", "d")])]);
    expect(suggestLensKinds(graph, lens("l", "d"), caps(["l"])).defaults.intensity).toEqual({
      intensityIndex: 0,
      colormap: "GREY",
      blending: "NORMAL",
    });
  });

  it("picks the next unstaged channel of a composite", () => {
    const graph = graphFromSpaces([space("grid-d", [multichannel("l", "d")])]);
    const staged = stagedFromLayers([stagedIntensity("s0", "d", { index: 0 })]);
    const defaults = suggestLensKinds(graph, multichannel("l", "d"), caps(["l"]), staged).defaults;
    expect(defaults.intensity).toEqual({ intensityIndex: 1, colormap: CHANNEL_CYCLE[1], blending: "ADDITIVE" });
    expect(defaults.rgb).toEqual({ redIndex: 0, greenIndex: 1, blueIndex: 2 });
  });

  it("copies a staged sibling's look across an IDENTICAL edge, colour only across TRANSFORMED", () => {
    const build = (relation: string) =>
      graphFromSpaces([
        space("grid-raw", [multichannel("l-raw", "raw")]),
        space("grid-d", [
          multichannel("l-d", "d", {
            derivedFrom: [edge("e", "grid-d", "grid-raw", { valueRelation: relation })],
          }),
        ]),
      ]);
    const staged = stagedFromLayers([
      stagedIntensity("s", "raw", { name: "DAPI", index: 0, colormap: "BLUE", climMin: 10, climMax: 200, gamma: 0.8 }),
    ]);

    const identical = suggestLensKinds(build("IDENTICAL"), multichannel("l-d", "d"), caps(["l-d"]), staged).defaults.intensity;
    expect(identical).toMatchObject({ intensityIndex: 0, colormap: "BLUE", climMin: 10, climMax: 200, gamma: 0.8, inheritedFrom: "DAPI" });

    const transformed = suggestLensKinds(build("TRANSFORMED"), multichannel("l-d", "d"), caps(["l-d"]), staged).defaults.intensity;
    expect(transformed).toMatchObject({ intensityIndex: 0, colormap: "BLUE", inheritedFrom: "DAPI" });
    expect(transformed?.climMin).toBeUndefined();
  });

  it("seeds a phasor the way a phasor render node starts", () => {
    const graph = graphFromSpaces([space("grid-d", [lens("l", "d")])]);
    const flim = lens("l", "d", { axisNames: ["tau", "c", "y", "x"], shape: [64, 2, 64, 64], intensity: "c", phasor: "tau" });
    expect(suggestLensKinds(graph, flim, caps(["l"])).defaults.phasor).toEqual({
      phasorAxis: "tau",
      harmonic: 1,
      intensityAxis: "c",
      intensityIndex: 0,
      colormap: "RAINBOW",
      mode: "PHASE",
      weightByIntensity: true,
      blending: "NORMAL",
    });
  });
});

describe("suggestTableKinds", () => {
  it("infers tracks from a TRACK_ID column and explains where the rows came from", () => {
    const graph = graphFromSpaces([
      space("grid-mask", [datasetResident("mask", { name: "cells.zarr" })]),
      space("space-t", [
        table("t", { roles: ["COORDINATE", "TRACK_ID"], derivedFrom: [edge("m", "space-t", "grid-mask", { kind: "UNMAPPABLE" })] }),
      ]),
    ]);
    const result = suggestTableKinds(graph, { id: "t", columns: [{ role: "COORDINATE" }, { role: "TRACK_ID" }] }, "ATTRIBUTE");
    expect(result.kinds).toEqual(["TRACK", "POINT"]);
    expect(result.evidence.map((e) => e.summary)).toEqual([
      "A track id column joins the rows into trajectories",
      "Measured from cells.zarr",
    ]);
    expect(result.defaults).toEqual({ colormap: "VIRIDIS" });
  });

  it("offers no colormap for a categorical colour column", () => {
    const graph = graphFromSpaces([]);
    expect(suggestTableKinds(graph, { id: "t", columns: [{ role: "COORDINATE" }] }, "LABEL").defaults).toEqual({});
    expect(suggestTableKinds(graph, { id: "t", columns: [{ role: "COORDINATE" }] }).kinds).toEqual(["POINT"]);
  });
});

describe("stagedFromLayers", () => {
  it("maps every layer arm to its container and space", () => {
    const staged = stagedFromLayers([
      stagedIntensity("a", "raw"),
      stagedLabel("b", "mask"),
      stagedPoints("c", "t"),
      stagedMesh("d", "m"),
      stagedNetwork("e", "n"),
      stagedAnnotations("f", "r"),
    ]);
    expect([...staged.nodes]).toEqual([
      datasetKey("raw"),
      datasetKey("mask"),
      "TableDataset:t",
      "MeshCollection:m",
      "NetworkCollection:n",
      "AnnotationCollection:r",
    ]);
    expect(staged.spaces.has("grid-raw")).toBe(true);
    expect(staged.spaces.has("space-n")).toBe(true);
  });
});

describe("relationToScene", () => {
  const graph = () =>
    graphFromSpaces([
      space("grid-raw", [lens("l-raw", "raw", { name: "dapi.zarr" })]),
      space("grid-mask", [
        lens("l-mask", "mask", {
          name: "cells.zarr",
          derivedFrom: [edge("seg", "grid-mask", "grid-raw", { valueRelation: "CATEGORIZED" })],
        }),
      ]),
      space("grid-nuclei", [
        lens("l-nuclei", "nuclei", {
          name: "nuclei.zarr",
          derivedFrom: [edge("seg2", "grid-nuclei", "grid-raw", { valueRelation: "CATEGORIZED" })],
        }),
      ]),
      space("space-t", [
        table("t", { name: "areas", derivedFrom: [edge("m", "space-t", "grid-mask", { kind: "UNMAPPABLE" })] }),
      ]),
    ]);

  it("says a mask was segmented from the staged image", () => {
    const g = graph();
    const staged = stagedFromLayers([stagedIntensity("s", "raw", { name: "DAPI" })]);
    const relation = relationToScene(g, g.nodes.get(datasetKey("mask"))!, staged);
    expect(relation).toMatchObject({ kind: "derived", depth: 1, rank: 100, summary: "segmented from DAPI" });

    const deeper = relationToScene(g, g.nodes.get("TableDataset:t")!, staged);
    expect(deeper).toMatchObject({ kind: "derived", depth: 2, rank: 90, summary: "derived from DAPI, 2 steps up" });
  });

  it("says an image is the source of the staged mask, and a sibling shares its source", () => {
    const g = graph();
    const staged = stagedFromLayers([stagedLabel("s", "mask", "cells")]);
    expect(relationToScene(g, g.nodes.get(datasetKey("raw"))!, staged)).toMatchObject({
      kind: "source",
      rank: 90,
      summary: "the source of cells",
    });
    expect(relationToScene(g, g.nodes.get(datasetKey("nuclei"))!, staged)).toMatchObject({
      kind: "sibling",
      rank: 70,
      summary: "shares its source, dapi.zarr, with cells",
    });
  });

  it("marks what is already staged, and counts the channels still to show", () => {
    const g = graph();
    const staged = stagedFromLayers([stagedIntensity("s", "raw", { index: 0 })]);
    const raw = g.nodes.get(datasetKey("raw"))!;
    expect(relationToScene(g, raw, staged)).toMatchObject({ kind: "staged", rank: -10 });
    expect(relationToScene(g, raw, staged, 3)).toMatchObject({ kind: "partial", rank: 50, summary: "1 of 3 channels shown" });
  });

  it("is null for something unrelated", () => {
    const g = graph();
    const staged = stagedFromLayers([stagedPoints("s", "elsewhere")]);
    expect(relationToScene(g, g.nodes.get(datasetKey("raw"))!, staged)).toBeNull();
  });
});
