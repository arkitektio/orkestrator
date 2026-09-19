import { describe, expect, it } from "vitest";
import * as THREE from "three";
import {
  buildMorphology,
  locationOf,
  pointAlong,
  type MorphologySectionInput,
} from "./buildMorphology";
import { buildNetworkLayout } from "./networkLayout";
import { sectionColors } from "./colouring";

const cell = (sections: MorphologySectionInput[]) => [
  { id: "cell", topology: { sections } },
];

const coord = (x: number, y: number, z: number, diam?: number) => ({
  x: `${x} µm`,
  y: `${y} µm`,
  z: `${z} µm`,
  diam: diam == null ? null : `${diam} µm`,
});

describe("buildMorphology", () => {
  it("draws a section with coords where the coords say", () => {
    const morph = buildMorphology(
      cell([
        {
          id: "soma",
          diam: "10 µm",
          coords: [coord(0, 0, 0), coord(0, 10, 0), coord(5, 20, 0, 4)],
        },
      ]),
    );
    const soma = morph.byId.get("soma")!;
    expect(soma.synthetic).toBe(false);
    expect(soma.points.map((p) => p.toArray())).toEqual([
      [0, 0, 0],
      [0, 10, 0],
      [5, 20, 0],
    ]);
    // Per-point diam wins; the section diam fills in where a point has none.
    expect(soma.radii).toEqual([5, 5, 2]);
    expect(morph.segmentCount).toBe(2);
    expect(morph.anySynthetic).toBe(false);
  });

  it("converts coords in other length units to µm", () => {
    const morph = buildMorphology(
      cell([{ id: "a", coords: [coord(0, 0, 0), { x: "0 mm", y: "0.01 mm", z: "0 mm" }] }]),
    );
    expect(morph.byId.get("a")!.points[1].y).toBeCloseTo(10);
  });

  it("lays out coords-less sections with the synthetic rule", () => {
    const morph = buildMorphology(
      cell([
        { id: "soma", length: "20 µm", diam: "10 µm" },
        { id: "dend", length: "100 µm", parent: { parent: "soma", parentLocation: 1 } },
      ]),
    );
    const soma = morph.byId.get("soma")!;
    const dend = morph.byId.get("dend")!;
    expect(soma.synthetic).toBe(true);
    expect(soma.points[1].toArray()).toEqual([0, 20, 0]);
    // A single child at the end tip continues along the parent's axis.
    expect(dend.points[0].toArray()).toEqual([0, 20, 0]);
    expect(dend.points[1].y).toBeCloseTo(120);
    expect(dend.depth).toBe(1);
    expect(morph.anySynthetic).toBe(true);
  });

  it("hangs a synthetic child off a real parent's polyline", () => {
    const morph = buildMorphology(
      cell([
        { id: "axon", coords: [coord(0, 0, 0), coord(10, 0, 0), coord(10, 30, 0)] },
        { id: "new", length: "5 µm", parent: { parent: "axon", parentLocation: 0.5 } },
      ]),
    );
    const child = morph.byId.get("new")!;
    // 50% of 40 µm arc length = 10 µm into the second (vertical) segment.
    expect(child.points[0].x).toBeCloseTo(10);
    expect(child.points[0].y).toBeCloseTo(10);
    // Mid-section children branch at a right angle to the local tangent (+y).
    const dir = child.points[1].clone().sub(child.points[0]).normalize();
    expect(Math.abs(dir.dot(new THREE.Vector3(0, 1, 0)))).toBeLessThan(1e-6);
    expect(child.length).toBeCloseTo(5);
  });

  it("swings a child continuously from sideways to forward along its parent", () => {
    const at = (parentLocation: number) => {
      const morph = buildMorphology(
        cell([
          { id: "p", length: "10 µm" },
          { id: "c", length: "1 µm", parent: { parent: "p", parentLocation } },
        ]),
      );
      const c = morph.byId.get("c")!;
      return c.points[1].clone().sub(c.points[0]).normalize().y;
    };
    expect(at(0.5)).toBeCloseTo(0);
    expect(at(0.75)).toBeGreaterThan(0);
    expect(at(0.75)).toBeLessThan(1);
    expect(at(1)).toBeCloseTo(1);
    expect(at(0)).toBeCloseTo(-1);
  });

  it("still draws a section whose parent is missing or cyclic", () => {
    const morph = buildMorphology(
      cell([
        { id: "orphan", parent: { parent: "nowhere" } },
        { id: "a", parent: { parent: "b" } },
        { id: "b", parent: { parent: "a" } },
      ]),
    );
    expect(morph.sections.map((s) => s.id).sort()).toEqual(["a", "b", "orphan"]);
  });

  it("tolerates degenerate sections", () => {
    const morph = buildMorphology(
      cell([
        { id: "zero", length: "0 µm" },
        { id: "single", coords: [coord(1, 1, 1)], length: "3 µm" },
      ]),
    );
    const zero = morph.byId.get("zero")!;
    expect(zero.length).toBe(0);
    expect(pointAlong(zero, 0.5).point.toArray()).toEqual([0, 0, 0]);
    // One coord is not a polyline: fall back to the synthetic layout.
    expect(morph.byId.get("single")!.synthetic).toBe(true);
  });

  it("fills the flat segment table in section order", () => {
    const morph = buildMorphology(
      cell([
        { id: "a", coords: [coord(0, 0, 0), coord(1, 0, 0), coord(2, 0, 0)] },
        { id: "b", length: "1 µm", parent: { parent: "a" } },
      ]),
    );
    expect(Array.from(morph.segSection)).toEqual([0, 0, 1]);
    expect(Array.from(morph.segIndex)).toEqual([0, 1, 0]);
    expect(morph.byId.get("b")!.firstSegment).toBe(2);
    expect(Array.from(morph.segEnd.slice(3, 6))).toEqual([2, 0, 0]);
  });
});

describe("pointAlong / locationOf", () => {
  const morph = buildMorphology(
    cell([{ id: "l", coords: [coord(0, 0, 0), coord(10, 0, 0), coord(10, 30, 0)] }]),
  );
  const section = morph.byId.get("l")!;

  it("interpolates by arc length", () => {
    expect(pointAlong(section, 0).point.toArray()).toEqual([0, 0, 0]);
    expect(pointAlong(section, 0.25).point.toArray()).toEqual([10, 0, 0]);
    const mid = pointAlong(section, 0.5);
    expect(mid.point.toArray()).toEqual([10, 10, 0]);
    expect(mid.tangent.toArray()).toEqual([0, 1, 0]);
    expect(mid.segment).toBe(1);
  });

  it.each([0, 0.1, 0.25, 0.6, 1])("round-trips %s", (location) => {
    const { point, segment } = pointAlong(section, location);
    expect(locationOf(section, segment, point)).toBeCloseTo(location);
  });

  it("clamps a pick beyond the segment ends", () => {
    expect(locationOf(section, 0, new THREE.Vector3(-5, 0, 0))).toBe(0);
    expect(locationOf(section, 1, new THREE.Vector3(10, 99, 0))).toBe(1);
  });
});

describe("buildNetworkLayout on the morphology", () => {
  it("places synapses on the real polyline, lifted to the hull", () => {
    const morph = buildMorphology(
      cell([{ id: "d", diam: "2 µm", coords: [coord(0, 0, 0), coord(100, 0, 0)] }]),
    );
    const net = buildNetworkLayout(
      {
        netSynapses: [
          { id: "s1", location: "d", position: 0.5, e: "0 mV" },
          { id: "s2", location: "missing", position: 0.5, e: "-80 mV" },
        ] as never,
        netStimulators: [],
        netConnections: [],
      },
      morph,
    );
    expect(net.unmatchedSynapses).toBe(1);
    const [placed] = net.synapses;
    expect(placed.excitatory).toBe(true);
    expect(placed.point.x).toBeCloseTo(50);
    // Radius 1 µm + marker radius off the axis.
    const offAxis = Math.hypot(placed.point.y, placed.point.z);
    expect(offAxis).toBeCloseTo(1 + net.markerRadius);
  });
});

describe("sectionColors", () => {
  it("falls back from compartment to depth, and mutes unscored importance", () => {
    const morph = buildMorphology(
      cell([
        { id: "a", category: "soma" },
        { id: "b", category: "dend", parent: { parent: "a" } },
      ]),
    );
    const compartments = new Map([["soma", "rgb(255, 0, 0)"]]);
    const byCompartment = sectionColors(morph, {
      colorBy: "compartment",
      compartments,
      importance: null,
      uniform: "white",
    });
    expect(Array.from(byCompartment.slice(0, 3))).toEqual([1, 0, 0]);
    expect(Array.from(byCompartment.slice(3, 6))).not.toEqual([1, 0, 0]);

    const byImportance = sectionColors(morph, {
      colorBy: "importance",
      compartments,
      importance: new Map([["a", "rgb(255, 255, 255)"]]),
      uniform: "white",
    });
    expect(Array.from(byImportance.slice(0, 3))).toEqual([1, 1, 1]);
    expect(byImportance[3]).toBeLessThan(0.1);
  });
});
