import { formatDisplay, toBase } from "@/core/util/quantities";
import { ElementKind, type LightpathGraphFragment } from "@/mikro/api/graphql";

/**
 * A light path graph, read as a microscope: which elements light the sample,
 * which ones carry its light to a detector, and what colour each beam is.
 *
 * Pure. Every element and every edge of the graph comes out the other side —
 * two lasers stay two, and both arms of a splitter survive. The picture
 * (`lightPathLayout.ts`) and both renderers are built on this reading.
 */

export type LightElement = LightpathGraphFragment["elements"][number];
export type LightEdge = LightpathGraphFragment["edges"][number];

export type Phase = "illumination" | "detection";

/**
 * Where an element sits on the stand: on the way in, at the sample, on the
 * way out, on the axis both beams share (the objective and the cube of an epi
 * microscope), or connected to nothing.
 */
export type Arm = "illumination" | "shared" | "sample" | "detection" | "loose";

export type PathElement = {
  id: string;
  element: LightElement;
  kind: ElementKind;
  arm: Arm;
  /** Steps from the sample along the arm; 0 is nearest. */
  order: number;
  /** Which of several elements at the same `order` this one is. */
  lane: number;
};

export type PathBeam = {
  id: string;
  edge: LightEdge;
  from: string;
  to: string;
  phase: Phase;
  /** Wavelength in nanometres, or null when the graph states none. */
  nm: number | null;
};

export type LightPath = {
  elements: PathElement[];
  beams: PathBeam[];
  /** Excitation and emission share the objective. */
  epi: boolean;
};

const SOURCE_KINDS: ReadonlySet<ElementKind> = new Set([
  ElementKind.Laser,
  ElementKind.Lamp,
  ElementKind.OtherSource,
]);

/** A length on the wire ("488 nm") as nanometres. */
export const toNanometers = (value: string | number | null | undefined): number | null => {
  // The shared parser's base length is the micrometre.
  const micrometers = toBase(value, "length");
  return Number.isFinite(micrometers) ? micrometers * 1000 : null;
};

type SpectrumLike = { min: string; max: string } | null | undefined;

const spectrumCenter = (spectrum: SpectrumLike): number | null => {
  if (!spectrum) return null;
  const min = toNanometers(spectrum.min);
  const max = toNanometers(spectrum.max);
  if (min === null || max === null) return null;
  return (min + max) / 2;
};

const portSpectrum = (element: LightElement | undefined, portId: string): SpectrumLike =>
  element?.ports.find((port) => port.id === portId)?.spectrum;

const bandOf = (element: LightElement | undefined): SpectrumLike =>
  element && "band" in element ? element.band : null;

const nominalOf = (element: LightElement | undefined): number | null =>
  element && "nominalWavelength" in element ? toNanometers(element.nominalWavelength) : null;

/**
 * The colour a wavelength is seen as, as an `rgb()` string. Outside the
 * visible range there is nothing to see: ultraviolet is drawn violet and
 * infrared deep red, the conventions of a filter chart. Null (no wavelength
 * recorded) is the caller's to draw as neutral.
 */
export const wavelengthToColor = (nm: number): string => {
  const w = Math.min(Math.max(nm, 380), 750);
  let r = 0;
  let g = 0;
  let b = 0;
  if (w < 440) [r, g, b] = [(440 - w) / 60, 0, 1];
  else if (w < 490) [r, g, b] = [0, (w - 440) / 50, 1];
  else if (w < 510) [r, g, b] = [0, 1, (510 - w) / 20];
  else if (w < 580) [r, g, b] = [(w - 510) / 70, 1, 0];
  else if (w < 645) [r, g, b] = [1, (645 - w) / 65, 0];
  else [r, g, b] = [1, 0, 0];
  // Keep the ends of the range bright enough to read on a dark panel.
  const floor = 0.25;
  const channel = (value: number) => Math.round(255 * (floor + (1 - floor) * value));
  return `rgb(${channel(r)}, ${channel(g)}, ${channel(b)})`;
};

export const buildLightPath = (graph: LightpathGraphFragment): LightPath => {
  const byId = new Map<string, LightElement>();
  for (const element of graph.elements) byId.set(element.id, element);

  // An edge naming an element the graph does not carry cannot be drawn.
  const edges = graph.edges.filter(
    (edge) => byId.has(edge.sourceElementId) && byId.has(edge.targetElementId),
  );
  const outgoing = new Map<string, LightEdge[]>();
  const incoming = new Map<string, LightEdge[]>();
  for (const edge of edges) {
    outgoing.set(edge.sourceElementId, [...(outgoing.get(edge.sourceElementId) ?? []), edge]);
    incoming.set(edge.targetElementId, [...(incoming.get(edge.targetElementId) ?? []), edge]);
  }

  // Where excitation turns into emission: the sample, or — in a graph that
  // records none — the objective standing in front of it.
  const pivots = new Set(
    (graph.elements.some((element) => element.kind === ElementKind.Sample)
      ? graph.elements.filter((element) => element.kind === ElementKind.Sample)
      : graph.elements.filter((element) => element.kind === ElementKind.Objective)
    ).map((element) => element.id),
  );

  // Hops to the nearest pivot, walking the edges backwards. An element with a
  // distance is on the way in; one without can only be on the way out.
  const toPivot = new Map<string, number>();
  let frontier = [...pivots];
  for (const id of frontier) toPivot.set(id, 0);
  while (frontier.length > 0) {
    const next: string[] = [];
    for (const id of frontier) {
      for (const edge of incoming.get(id) ?? []) {
        if (toPivot.has(edge.sourceElementId)) continue;
        toPivot.set(edge.sourceElementId, toPivot.get(id)! + 1);
        next.push(edge.sourceElementId);
      }
    }
    frontier = next;
  }

  const beams = new Map<string, PathBeam>();
  const depth: Record<Phase, Map<string, number>> = {
    illumination: new Map(),
    detection: new Map(),
  };

  /**
   * Follow the light forward from `starts`. An element is visited once per
   * phase, so the objective of an epi microscope — which the graph passes
   * twice — is walked twice and the walk still ends.
   */
  const walk = (
    phase: Phase,
    starts: { id: string; nm: number | null }[],
    follows: (edge: LightEdge) => boolean,
  ) => {
    let queue = starts;
    for (const { id } of queue) if (!depth[phase].has(id)) depth[phase].set(id, 0);
    while (queue.length > 0) {
      const next: typeof queue = [];
      for (const { id, nm } of queue) {
        for (const edge of outgoing.get(id) ?? []) {
          if (beams.has(edge.id) || !follows(edge)) continue;
          const source = byId.get(id);
          const carried =
            toNanometers(edge.beam?.wavelength) ??
            spectrumCenter(portSpectrum(source, edge.sourcePortId)) ??
            nm ??
            // What a dichroic or a splitter passes on is its band.
            (phase === "detection" ? spectrumCenter(bandOf(source)) : null);
          beams.set(edge.id, {
            id: edge.id,
            edge,
            from: edge.sourceElementId,
            to: edge.targetElementId,
            phase,
            nm: carried,
          });
          const target = edge.targetElementId;
          if (depth[phase].has(target)) continue;
          depth[phase].set(target, depth[phase].get(id)! + 1);
          // Excitation ends at the sample; what leaves it is another colour.
          if (phase === "illumination" && pivots.has(target)) continue;
          next.push({ id: target, nm: carried });
        }
      }
      queue = next;
    }
  };

  const sources = graph.elements.filter(
    (element) => SOURCE_KINDS.has(element.kind) && !pivots.has(element.id),
  );
  const starts = (
    sources.length > 0
      ? sources
      : graph.elements.filter(
          (element) =>
            !pivots.has(element.id) &&
            (incoming.get(element.id) ?? []).length === 0 &&
            (outgoing.get(element.id) ?? []).length > 0,
        )
  ).map((element) => ({ id: element.id, nm: nominalOf(element) }));

  // In: only along edges that get closer to the sample. The objective's other
  // way out (back to the cube, on to the camera) belongs to the way back.
  walk("illumination", starts, (edge) => {
    const here = toPivot.get(edge.sourceElementId);
    const there = toPivot.get(edge.targetElementId);
    return here !== undefined && there !== undefined && there < here;
  });
  // Out: everything downstream of the sample, never back into it.
  walk(
    "detection",
    [...pivots].map((id) => ({ id, nm: null })),
    (edge) => !pivots.has(edge.targetElementId),
  );
  // What is left hangs off the way in without reaching the sample (a power
  // monitor behind a pick-off): still part of the illumination.
  walk(
    "illumination",
    [...depth.illumination.keys()]
      .filter((id) => !depth.detection.has(id))
      .map((id) => ({ id, nm: null })),
    () => true,
  );
  for (const edge of edges) {
    if (beams.has(edge.id)) continue;
    beams.set(edge.id, {
      id: edge.id,
      edge,
      from: edge.sourceElementId,
      to: edge.targetElementId,
      phase: "illumination",
      nm: toNanometers(edge.beam?.wavelength),
    });
  }

  const connected = new Set(edges.flatMap((edge) => [edge.sourceElementId, edge.targetElementId]));
  const placed = graph.elements.map((element): Omit<PathElement, "lane"> => {
    const base = { id: element.id, element, kind: element.kind };
    if (element.kind === ElementKind.Sample) return { ...base, arm: "sample", order: 0 };
    if (!connected.has(element.id)) return { ...base, arm: "loose", order: 0 };
    const out = depth.detection.get(element.id);
    const lit = depth.illumination.has(element.id) && !pivots.has(element.id);
    // Both beams pass it, or it is the objective the sample is seen through.
    if (out !== undefined && (lit || element.kind === ElementKind.Objective || pivots.has(element.id))) {
      return { ...base, arm: "shared", order: out };
    }
    if (out !== undefined) return { ...base, arm: "detection", order: out };
    return {
      ...base,
      arm: "illumination",
      // A side branch never reaches the sample; it trails the arm instead.
      order: toPivot.get(element.id) ?? (depth.illumination.get(element.id) ?? 0) + 1,
    };
  });

  const lanes = new Map<string, number>();
  const elements = placed.map((entry) => {
    const key = `${entry.arm}:${entry.order}`;
    const lane = lanes.get(key) ?? 0;
    lanes.set(key, lane + 1);
    return { ...entry, lane };
  });

  const epi = elements.some(
    (entry) => entry.arm === "shared" && depth.illumination.has(entry.id) && !pivots.has(entry.id),
  );

  return { elements, beams: [...beams.values()], epi };
};

/** How an element kind reads to a person. */
export const KIND_LABEL: Record<ElementKind, string> = {
  [ElementKind.Aperture]: "Aperture",
  [ElementKind.BeamSplitter]: "Beam splitter",
  [ElementKind.Ccd]: "Camera",
  [ElementKind.Detector]: "Detector",
  [ElementKind.Filter]: "Filter",
  [ElementKind.Lamp]: "Lamp",
  [ElementKind.Laser]: "Laser",
  [ElementKind.Lens]: "Lens",
  [ElementKind.Mirror]: "Mirror",
  [ElementKind.Objective]: "Objective",
  [ElementKind.Other]: "Element",
  [ElementKind.OtherSource]: "Source",
  [ElementKind.Pinhole]: "Pinhole",
  [ElementKind.Polarizer]: "Polarizer",
  [ElementKind.Sample]: "Sample",
  [ElementKind.Shutter]: "Shutter",
  [ElementKind.Waveplate]: "Waveplate",
};

export type ElementDetail = { label: string; value: string };

const band = (spectrum: SpectrumLike): string | null =>
  spectrum ? `${formatDisplay(spectrum.min, "length")} – ${formatDisplay(spectrum.max, "length")}` : null;

/** What is recorded about one element, as rows: only what the graph states. */
export const elementDetails = (element: LightElement): ElementDetail[] => {
  const details: ElementDetail[] = [];
  const add = (label: string, value: string | number | null | undefined) => {
    if (value !== null && value !== undefined && value !== "") details.push({ label, value: String(value) });
  };

  switch (element.__typename) {
    case "LaserElement":
      add("Wavelength", element.nominalWavelength && formatDisplay(element.nominalWavelength, "length"));
      add("Power", element.power && formatDisplay(element.power));
      add("Pulse", element.pulseKind);
      add("Repetition", element.repetitionRate && formatDisplay(element.repetitionRate));
      break;
    case "LampElement":
      add("Type", element.lampType);
      break;
    case "ObjectiveElement":
      add("Magnification", element.magnification != null ? `${element.magnification}×` : null);
      add("NA", element.numericalAperture);
      add("Working distance", element.workingDistance && formatDisplay(element.workingDistance, "length"));
      add("Immersion", element.immersionMedium);
      break;
    case "DetectorElement":
      add("Gain", element.gain);
      add("NEP", element.nepdWPerSqrtHz != null ? `${element.nepdWPerSqrtHz} W/√Hz` : null);
      break;
    case "CCDElement":
      add("Pixel size", element.pixelSize && formatDisplay(element.pixelSize, "length"));
      add("Resolution", element.resolution?.join(" × "));
      break;
    case "MirrorElement":
      add("Angle", element.angleDeg != null ? `${element.angleDeg}°` : null);
      add("Band", band(element.band));
      break;
    case "BeamSplitterElement":
      add("R / T", `${element.rFraction} / ${element.tFraction}`);
      add("Band", band(element.band));
      break;
    case "LensElement":
      add("Focal length", element.focalLength && formatDisplay(element.focalLength, "length"));
      break;
    case "PinholeElement":
    case "ApertureElement":
      add("Diameter", element.diameter && formatDisplay(element.diameter, "length"));
      break;
    case "PolarizerElement":
      add("Angle", element.angleDeg != null ? `${element.angleDeg}°` : null);
      break;
    case "WaveplateElement":
      add("Angle", element.angleDeg != null ? `${element.angleDeg}°` : null);
      add("Retardance", element.retardance);
      break;
    case "ShutterElement":
      add("State", element.isOpen == null ? null : element.isOpen ? "open" : "closed");
      break;
    default:
      break;
  }

  // A band stated on a port is the element's as far as a reader is concerned
  // (a converter that knows only "this channel is 525 nm" puts it there).
  for (const port of element.ports) {
    const stated = band(port.spectrum);
    if (stated) add(port.name, stated);
  }
  add("Manufacturer", element.manufacturer);
  add("Model", element.model);
  return details;
};
