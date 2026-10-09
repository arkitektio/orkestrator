import { ElementKind, type LightpathGraphFragment } from "@/mikro/api/graphql";

/** Light path graphs in the shapes the converters write them, for the tests. */

type Loose = Record<string, unknown>;

const TYPENAME: Partial<Record<ElementKind, string>> = {
  [ElementKind.Ccd]: "CCDElement",
};

const typename = (kind: ElementKind) =>
  TYPENAME[kind] ??
  `${kind
    .toLowerCase()
    .split("_")
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join("")}Element`;

const port = (id: string, spectrum?: [number, number]) => ({
  id,
  name: id,
  role: id.includes("in") ? "INPUT" : "OUTPUT",
  channel: "FREE_SPACE",
  spectrum: spectrum ? { min: `${spectrum[0]} nm`, max: `${spectrum[1]} nm` } : null,
});

export const element = (id: string, kind: ElementKind, extra: Loose = {}, ports: Loose[] = []) => ({
  __typename: typename(kind),
  id,
  label: id,
  kind,
  manufacturer: null,
  model: null,
  pose: null,
  ports,
  ...extra,
});

export const edge = (from: string, to: string, extra: Loose = {}) => {
  const [source, sourcePort = "out"] = from.split(":");
  const [target, targetPort = "in"] = to.split(":");
  return {
    id: `${from}->${to}`,
    sourceElementId: source,
    sourcePortId: sourcePort,
    targetElementId: target,
    targetPortId: targetPort,
    medium: null,
    pathLength: null,
    beam: null,
    ...extra,
  };
};

export const graph = (elements: Loose[], edges: Loose[]) =>
  ({ elements, edges }) as unknown as LightpathGraphFragment;

/** What the MetaMorph converter writes: four elements, the objective passed twice. */
export const widefield = graph(
  [
    element("illuminator", ElementKind.Lamp, { lampType: "soSPIM-488" }, [port("out", [488, 488])]),
    element("objective", ElementKind.Objective, { magnification: 60, numericalAperture: 1.27 }, [
      port("illum-in"),
      port("illum-out"),
      port("det-in"),
      port("det-out", [525, 525]),
    ]),
    element("sample", ElementKind.Sample, {}, [port("illum-in"), port("em-out", [525, 525])]),
    element("camera", ElementKind.Detector, {}, [port("in")]),
  ],
  [
    edge("illuminator:out", "objective:illum-in"),
    edge("objective:illum-out", "sample:illum-in"),
    edge("sample:em-out", "objective:det-in"),
    edge("objective:det-out", "camera:in"),
  ],
);

/** A confocal: two lasers combined, a dichroic, and the emission split onto two detectors. */
export const confocal = graph(
  [
    element("488", ElementKind.Laser, { nominalWavelength: "488 nm" }),
    element("561", ElementKind.Laser, { nominalWavelength: "561 nm" }),
    element("combiner", ElementKind.BeamSplitter, { rFraction: 0.5, tFraction: 0.5, band: null }),
    element("dichroic", ElementKind.Mirror, { angleDeg: 45, band: { min: "500 nm", max: "700 nm" } }),
    element("objective", ElementKind.Objective, { magnification: 40, numericalAperture: 1.3 }),
    element("sample", ElementKind.Sample),
    element("pinhole", ElementKind.Pinhole, { diameter: "50 µm" }),
    element("splitter", ElementKind.BeamSplitter, { rFraction: 0.5, tFraction: 0.5, band: null }),
    element("green", ElementKind.Filter, {}, [port("out", [500, 550])]),
    element("red", ElementKind.Filter, {}, [port("out", [580, 650])]),
    element("pmt1", ElementKind.Detector),
    element("pmt2", ElementKind.Detector),
    element("spare", ElementKind.Lens, { focalLength: "200 mm" }),
  ],
  [
    edge("488", "combiner"),
    edge("561", "combiner"),
    edge("combiner", "dichroic"),
    edge("dichroic", "objective"),
    edge("objective", "sample"),
    edge("sample", "objective"),
    edge("objective", "dichroic"),
    edge("dichroic", "pinhole"),
    edge("pinhole", "splitter"),
    edge("splitter", "green"),
    edge("splitter", "red"),
    edge("green", "pmt1"),
    edge("red", "pmt2"),
  ],
);

/** Transmitted light: the lamp never passes the objective. */
export const brightfield = graph(
  [
    element("lamp", ElementKind.Lamp),
    element("sample", ElementKind.Sample),
    element("objective", ElementKind.Objective),
    element("camera", ElementKind.Ccd, { pixelSize: "6.5 µm", resolution: [2048, 2048] }),
  ],
  [edge("lamp", "sample"), edge("sample", "objective"), edge("objective", "camera")],
);
