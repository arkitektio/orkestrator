import { formatDisplay } from "@/lib/quantities";
import {
  DeviceRows,
  MetadataAnchorBox,
  MetadataChip,
  MetadataHeader,
  MetadataRow,
  ValueHistogramSpoke,
} from "@/lib/scene/metadata/MetadataChrome";
import type {
  FullCoordinateAnchorFragment,
  LightpathGraphFragment,
} from "@/mikro-next/api/graphql";
import { LightPathListView } from "@/mikro-next/components/lightpath/LightPathListView";

/**
 * How one coordinate anchor's metadata spokes are drawn — the presentational
 * half of the viewport's metadata overlay, split out so a surface with no
 * scene (the table dataset page, which has rows rather than a viewport) can
 * draw an anchor without dragging the scene stores in. `AnchorMetadata.tsx`
 * keeps the scene-coupled half: which anchors are in view of a layer.
 *
 * Everything here takes plain data and reads on the white-on-black chrome.
 */

/**
 * What the panel renders. Structural, so both the thin `SceneLens.activeAnchors`
 * projection and the full `FullCoordinateAnchorFragment` satisfy it — the panel
 * degrades field by field rather than switching modes.
 */
export type PanelAnchor = {
  id: string;
  coordinates: unknown;
  channelLabel?: { label: string } | null;
  valueHistogram?: {
    bins: number[];
    histogram: number[];
    min?: number | null;
    max?: number | null;
    p1?: number | null;
    p99?: number | null;
  } | null;
  lightGraph?: { graph: LightpathGraphFragment } | null;
  microscope?: FullCoordinateAnchorFragment["microscope"];
  phasorCalibrations?: FullCoordinateAnchorFragment["phasorCalibrations"];
  phasorHistograms?: FullCoordinateAnchorFragment["phasorHistograms"];
  omeMetadata?: { metadata: unknown } | null;
};

export const MicroscopeSpoke = ({
  microscope,
}: {
  microscope: NonNullable<FullCoordinateAnchorFragment["microscope"]>;
}) => {
  const { stage, temperature, devices } = microscope.state;
  const stagePose = stage
    ? [stage.x, stage.y, stage.z]
        .map((axis) => formatDisplay(axis, "length"))
        .join(" / ")
    : null;

  return (
    <div className="flex flex-col gap-1">
      <MetadataHeader>Microscope</MetadataHeader>
      {stagePose && <MetadataRow label="stage" value={stagePose} />}
      {temperature != null && (
        <MetadataRow label="temp" value={formatDisplay(temperature)} />
      )}
      <DeviceRows devices={devices} />
    </div>
  );
};

export const PhasorSpoke = ({ anchor }: { anchor: PanelAnchor }) => {
  const calibrations = anchor.phasorCalibrations ?? [];
  const histograms = anchor.phasorHistograms ?? [];
  if (calibrations.length === 0 && histograms.length === 0) return null;

  return (
    <div className="flex flex-col gap-1">
      <MetadataHeader>Phasor</MetadataHeader>
      {calibrations.map((calibration) => (
        <MetadataRow
          key={calibration.id}
          label={`h${calibration.harmonic} cal`}
          value={[
            calibration.phaseOffset != null &&
              `φ ${calibration.phaseOffset.toFixed(3)}`,
            calibration.modulationFactor != null &&
              `m ${calibration.modulationFactor.toFixed(3)}`,
            calibration.reference,
          ]
            .filter(Boolean)
            .join(" · ")}
        />
      ))}
      {histograms.map((histogram) => (
        <MetadataRow
          key={histogram.id}
          label={`h${histogram.harmonic} dist`}
          value={`${histogram.axis} · ${histogram.bins}² bins · ${
            histogram.calibrated ? "calibrated" : "uncalibrated"
          }${histogram.total != null ? ` · n=${histogram.total}` : ""}`}
        />
      ))}
    </div>
  );
};

/** OME metadata is a whole document; a panel shows its headline entries. */
const OME_ENTRY_LIMIT = 8;

/**
 * The top-level SCALAR entries of an OME metadata document, capped. Nested
 * objects and arrays (planes, channels, the instrument tree) are skipped
 * rather than stringified: a JSON blob in a 9px row tells nobody anything.
 */
export const omeEntries = (metadata: unknown): [string, string][] => {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return [];
  }
  return Object.entries(metadata as Record<string, unknown>)
    .filter(([, value]) => value !== null && value !== undefined && typeof value !== "object")
    .slice(0, OME_ENTRY_LIMIT)
    .map(([key, value]) => [key, String(value)]);
};

export const OmeSpoke = ({ omeMetadata }: { omeMetadata: { metadata: unknown } }) => {
  const entries = omeEntries(omeMetadata.metadata);
  if (entries.length === 0) return null;

  return (
    <div className="flex flex-col gap-1">
      <MetadataHeader>OME</MetadataHeader>
      {entries.map(([key, value]) => (
        <MetadataRow key={key} label={key} value={value} />
      ))}
    </div>
  );
};

/** One in-view anchor: whichever metadata spokes it carries. */
export const ActiveAnchor = ({ anchor }: { anchor: PanelAnchor }) => {
  const hasSpokes =
    Boolean(anchor.channelLabel) ||
    Boolean(anchor.valueHistogram) ||
    Boolean(anchor.lightGraph) ||
    Boolean(anchor.microscope) ||
    (anchor.phasorCalibrations?.length ?? 0) > 0 ||
    (anchor.phasorHistograms?.length ?? 0) > 0 ||
    omeEntries(anchor.omeMetadata?.metadata).length > 0;

  return (
    <MetadataAnchorBox>
      {/* Which slice the anchor pins is not shown — the host decided it is in
          view, and that is all the reader needs; the coordinates are noise
          on a viewport. A host where they are the identity (a table, whose
          rows have no slider) captions the box itself. */}
      {anchor.channelLabel?.label && (
        <MetadataChip>{anchor.channelLabel.label}</MetadataChip>
      )}

      {anchor.valueHistogram && (
        <ValueHistogramSpoke histogram={anchor.valueHistogram} />
      )}

      {anchor.lightGraph && (
        <div className="flex flex-col gap-1">
          <MetadataHeader>Light path</MetadataHeader>
          {/* LightPathListView styles itself with themed tokens rather than the
              scene's white-on-black chrome. They read correctly on this
              near-black surface in the dark theme, and the wrapper sets the
              inherited color so they do in the light theme too. */}
          <div className="text-white/85">
            <LightPathListView graph={anchor.lightGraph.graph} />
          </div>
        </div>
      )}

      {anchor.microscope && <MicroscopeSpoke microscope={anchor.microscope} />}

      {anchor.omeMetadata && <OmeSpoke omeMetadata={anchor.omeMetadata} />}

      <PhasorSpoke anchor={anchor} />

      {!hasSpokes && (
        <span className="text-[9px] text-white/40">no metadata recorded</span>
      )}
    </MetadataAnchorBox>
  );
};
