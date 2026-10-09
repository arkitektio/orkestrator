import { describe, expect, it } from "vitest";
import { ElementKind } from "@/mikro/api/graphql";
import { brightfield, confocal, edge, element, graph, widefield } from "./lightPath.fixtures";
import { layoutLightPath } from "./lightPathLayout";
import { buildLightPath, elementDetails, toNanometers, wavelengthToColor } from "./lightPathModel";

const arms = (path: ReturnType<typeof buildLightPath>) =>
  Object.fromEntries(path.elements.map((entry) => [entry.id, entry.arm]));
const phases = (path: ReturnType<typeof buildLightPath>) =>
  Object.fromEntries(path.beams.map((beam) => [beam.id, beam.phase]));

describe("buildLightPath", () => {
  it("walks the objective twice and stops", () => {
    const path = buildLightPath(widefield);
    expect(path.epi).toBe(true);
    expect(arms(path)).toEqual({
      illuminator: "illumination",
      objective: "shared",
      sample: "sample",
      camera: "detection",
    });
    expect(phases(path)).toEqual({
      "illuminator:out->objective:illum-in": "illumination",
      "objective:illum-out->sample:illum-in": "illumination",
      "sample:em-out->objective:det-in": "detection",
      "objective:det-out->camera:in": "detection",
    });
  });

  it("colours the beam from the band on the port it leaves by", () => {
    const path = buildLightPath(widefield);
    const nm = Object.fromEntries(path.beams.map((beam) => [beam.id, beam.nm]));
    expect(nm["illuminator:out->objective:illum-in"]).toBe(488);
    // Carried through an element that states nothing of its own.
    expect(nm["objective:illum-out->sample:illum-in"]).toBe(488);
    // Excitation is not what comes back.
    expect(nm["sample:em-out->objective:det-in"]).toBe(525);
  });

  it("keeps every element and both arms of a splitter", () => {
    const path = buildLightPath(confocal);
    expect(path.elements).toHaveLength(confocal.elements.length);
    expect(path.beams).toHaveLength(confocal.edges.length);
    expect(arms(path)).toMatchObject({
      "488": "illumination",
      "561": "illumination",
      combiner: "illumination",
      dichroic: "shared",
      objective: "shared",
      pinhole: "detection",
      pmt1: "detection",
      pmt2: "detection",
      spare: "loose",
    });
    // Two lasers at the same distance stand side by side, not on top of each other.
    const lanes = path.elements.filter((entry) => entry.kind === ElementKind.Laser).map((entry) => entry.lane);
    expect(lanes.sort()).toEqual([0, 1]);
    const nm = Object.fromEntries(path.beams.map((beam) => [beam.id, beam.nm]));
    expect(nm["488->combiner"]).toBe(488);
    expect(nm["561->combiner"]).toBe(561);
    // The dichroic's band is what it sends on to the detectors.
    expect(nm["dichroic->pinhole"]).toBe(600);
    expect(nm["green->pmt1"]).toBe(525);
  });

  it("reads a source that never passes the objective as transmitted light", () => {
    const path = buildLightPath(brightfield);
    expect(path.epi).toBe(false);
    expect(arms(path)).toEqual({ lamp: "illumination", sample: "sample", objective: "shared", camera: "detection" });
  });

  it("survives a graph with no edges and one naming a missing element", () => {
    const path = buildLightPath(
      graph([element("a", ElementKind.Laser), element("b", ElementKind.Detector)], [edge("a", "ghost")]),
    );
    expect(path.beams).toEqual([]);
    expect(path.elements.map((entry) => entry.arm)).toEqual(["loose", "loose"]);
  });
});

describe("layoutLightPath", () => {
  it.each([
    ["widefield", widefield],
    ["confocal", confocal],
    ["brightfield", brightfield],
  ])("gives every element of %s its own place", (_name, fixture) => {
    const layout = layoutLightPath(buildLightPath(fixture));
    const places = layout.nodes.map((node) => node.position.join(","));
    expect(new Set(places).size).toBe(fixture.elements.length);
    for (const beam of layout.beams) expect(beam.points.length).toBeGreaterThanOrEqual(2);
  });

  it("stands an epi source beside the axis and a transmitted one above the stage", () => {
    const at = (fixture: typeof widefield, id: string) =>
      layoutLightPath(buildLightPath(fixture)).nodes.find((node) => node.id === id)!.position;
    const sample = at(widefield, "sample");
    expect(at(widefield, "illuminator")[0]).toBeLessThan(0);
    expect(at(widefield, "illuminator")[1]).toBeLessThan(sample[1]);
    expect(at(widefield, "camera")[0]).toBeGreaterThan(0);
    expect(at(brightfield, "lamp")[0]).toBe(0);
    expect(at(brightfield, "lamp")[1]).toBeGreaterThan(at(brightfield, "sample")[1]);
  });

  it("turns a corner where no folding element was recorded, and draws a ghost there", () => {
    const layout = layoutLightPath(buildLightPath(widefield));
    const into = layout.beams.find((beam) => beam.id === "illuminator:out->objective:illum-in")!;
    expect(into.points).toHaveLength(3);
    expect(layout.ghost.map((part) => part.id)).toContain("cube");
    // A recorded dichroic IS the fold: no ghost in its place.
    expect(layoutLightPath(buildLightPath(confocal)).ghost.map((part) => part.id)).not.toContain("cube");
  });

  it("uses recorded poses when every element has one", () => {
    const posed = graph(
      [
        element("a", ElementKind.Laser, { pose: { position: { x: 0, y: 0, z: 0 } } }),
        element("b", ElementKind.Detector, { pose: { position: { x: 10, y: 0, z: 0 } } }),
      ],
      [edge("a", "b")],
    );
    const layout = layoutLightPath(buildLightPath(posed));
    expect(layout.posed).toBe(true);
    expect(layout.ghost).toEqual([]);
    expect(layout.nodes[0].position[0]).toBeLessThan(layout.nodes[1].position[0]);
  });
});

describe("wavelengths", () => {
  it("reads lengths through the shared parser", () => {
    expect(toNanometers("488 nm")).toBe(488);
    expect(toNanometers("0.5 µm")).toBe(500);
    expect(toNanometers(null)).toBeNull();
    expect(toNanometers("soon")).toBeNull();
  });

  it("colours by what the eye sees", () => {
    const rgb = (nm: number) => wavelengthToColor(nm).match(/\d+/g)!.map(Number);
    const [blueR, , blueB] = rgb(470);
    expect(blueB).toBeGreaterThan(blueR);
    const [, greenG, greenB] = rgb(525);
    expect(greenG).toBeGreaterThan(greenB);
    const [redR, redG] = rgb(650);
    expect(redR).toBeGreaterThan(redG);
    // Out of range clamps instead of going black.
    expect(wavelengthToColor(1040)).toBe(wavelengthToColor(750));
  });

  it("lists only what an element states", () => {
    const [, objective] = widefield.elements;
    expect(elementDetails(objective)).toEqual([
      { label: "Magnification", value: "60×" },
      { label: "NA", value: "1.27" },
      { label: "det-out", value: "525 nm – 525 nm" },
    ]);
  });
});
