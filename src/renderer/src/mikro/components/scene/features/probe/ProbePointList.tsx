import { useCallback, useEffect, useMemo, useState } from "react";
import { ProbeTime } from "./ProbeTime";
import {
  useAttributeServiceOrNull,
  useAttributesAt,
} from "@/mikro/lib/attributes/AttributeServiceProvider";
import { executeOptionsFor, selectHops } from "@/mikro/lib/attributes/attributeSelection";
import { hopMetasOf } from "@/mikro/lib/attributes/attributeTypes";
import { ComparedHopBlock, ComparisonGrid } from "../../platform/layerui/AttributeComparisonViews";
import type { HopBlock } from "../../platform/layerui/AttributeRowsSection";
import {
  compareHopBlocks,
  comparedPointName,
  type ComparedPoint,
} from "../../platform/layerui/attributeComparison";
import {
  LIVE_PROBE_COLOR,
  isSameProbePoint,
  probePointColor,
  type ProbePoint,
  type ProbePointLookup,
} from "../../platform/probe/probePoints";
import { isSameProbeKey, type ProbeResult } from "../../platform/probe/probeTypes";
import { formatProbeValue } from "../../platform/probe/valueFormat";
import { useSceneStore } from "../../platform/stores/sceneStore";
import { useViewerStore } from "../../platform/stores/viewerStore";
import { useProbedLayer } from "./ProbeChannelValues";

/**
 * The pinned probe points, under the live readout — COMPARED, not listed.
 *
 * A legend names the points; below it everything they share is one block with
 * a column per point: the channel values of a layer, the rows of a table, the
 * entries of a matrix, and the lines of an array drawn over each other
 * (`platform/layerui/attributeComparison.ts` decides what merges). Three
 * points on three cells is one table and one plot, not three of each.
 *
 * The LIVE probe sits in with them as a last column, "live", so what is under
 * the cursor reads against what was pinned; it is left out while it rests on
 * a place that is already a point.
 *
 * A point's values and rows are its READINGS — one per visible layer at the
 * click (`ProbePointReading`) — so the blocks group by layer, not by the
 * layer the click happened to hit. Each reading asks the shared attribute
 * service about ITSELF, at the coordinates frozen when it was pinned
 * (`ProbePointLookup`) — the live readout's `probedAttributes` slots follow
 * the cursor.
 * The headless lookups below report what settled; the service caches per
 * point, so a click the hover already answered costs nothing.
 */

type Lookup =
  | { status: "loading" }
  | { status: "error"; error: string }
  | { status: "ready"; blocks: readonly HopBlock[] };

type Report = (pointId: string, lookup: Lookup | null) => void;

const LOADING: Lookup = { status: "loading" };

const useReport = (pointId: string, lookup: Lookup, report: Report) => {
  useEffect(() => report(pointId, lookup), [pointId, lookup, report]);
  useEffect(() => () => report(pointId, null), [pointId, report]);
};

/** A voxel point: the plans sample their field array at the coordinates. */
const VoxelPointLookup = ({
  pointId,
  lookup,
  report,
}: {
  pointId: string;
  lookup: ProbePointLookup;
  report: Report;
}) => {
  const selection = useViewerStore((s) => s.attributeSelection);
  const { status, results, error } = useAttributesAt({
    systemId: lookup.systemId,
    coords: lookup.coords,
    selection,
  });
  const settled = useMemo<Lookup>(() => {
    if (status === "error") return { status: "error", error: error ?? "lookup failed" };
    if (status !== "ready") return LOADING;
    return {
      status: "ready",
      blocks: results.map((result) => ({ meta: result, state: result.state })),
    };
  }, [status, results, error]);
  useReport(pointId, settled, report);
  return null;
};

/**
 * A mesh pick: the instance id IS the field value, so the plans run through
 * the value-known executor — there is no array to sample at a mesh vertex.
 */
const MeshPointLookup = ({
  pointId,
  lookup,
  instanceValue,
  report,
}: {
  pointId: string;
  lookup: ProbePointLookup;
  instanceValue: number;
  report: Report;
}) => {
  const service = useAttributeServiceOrNull();
  const selection = useViewerStore((s) => s.attributeSelection);
  const [settled, setSettled] = useState<Lookup>(LOADING);

  useEffect(() => {
    if (!service) return;
    let stale = false;
    setSettled(LOADING);
    void (async () => {
      const plans = await service.plansFor(lookup.systemId);
      const blocks = await Promise.all(
        plans.map(async (plan): Promise<HopBlock[]> => {
          const hops = selectHops(selection, plan);
          if (hops.length === 0) return [];
          const states = await service.executePlanWithValue(plan, lookup.coords, instanceValue, {
            ...executeOptionsFor(selection, plan),
            isStale: () => stale,
          });
          if (!states) return [];
          return hopMetasOf(plan, hops).flatMap((meta) => {
            const hopState = states[meta.hopKey];
            return hopState ? [{ meta, state: hopState }] : [];
          });
        }),
      );
      if (!stale) setSettled({ status: "ready", blocks: blocks.flat() });
    })().catch((error: unknown) => {
      if (stale) return;
      setSettled({
        status: "error",
        error: error instanceof Error ? error.message : "attribute lookup failed",
      });
    });
    return () => {
      stale = true;
    };
  }, [service, lookup, instanceValue, selection]);

  useReport(pointId, settled, report);
  return null;
};

const comparedPoint = (point: ProbePoint): ComparedPoint => ({
  id: point.id,
  index: point.index,
  color: probePointColor(point.index),
});

const LIVE_POINT: ComparedPoint = { id: "live", index: 0, color: LIVE_PROBE_COLOR, label: "live" };

/** A cell source of the comparison: one layer's reading at a pinned point, or
 * at the live probe. A legend row is the same shape with the HIT as `probe`. */
type Reading = { point: ComparedPoint; probe: ProbeResult };

/** A reading's lookup slot: a point has one per layer it read. */
const lookupId = (pointId: string, layerId: string) => `${pointId}|${layerId}`;

/** A point's lookups as the legend says them: loading while any is, else
 * failed if any did. */
const pointLookup = (
  point: ProbePoint,
  lookups: Readonly<Record<string, Lookup>>,
): Lookup | undefined => {
  const mine = point.readings.flatMap((reading) => {
    const lookup = lookups[lookupId(point.id, reading.probe.layerId)];
    return lookup ? [lookup] : [];
  });
  return (
    mine.find((lookup) => lookup.status === "loading") ??
    mine.find((lookup) => lookup.status === "error") ??
    mine[0]
  );
};

/** Where a point's values came from, in the readout's own words. */
const sourceOf = (probe: ProbeResult): string => {
  const { source, level } = probe.provenance;
  if (source === "exact") return "exact";
  if (source === "resident") return level === 0 ? "level 0" : `~LOD ${level}`;
  return "not loaded";
};

const LegendRow = ({
  reading,
  lookup,
  onRemove,
}: {
  reading: Reading;
  lookup?: Lookup;
  /** Absent for the live probe: it follows the cursor, there is nothing to remove. */
  onRemove?: () => void;
}) => {
  const { point, probe } = reading;
  // A pinned point keeps the frame it was pinned on; the live one (no entry) follows the slider.
  const pinnedCoords = useViewerStore(
    (s) => s.probePoints.find((candidate) => candidate.id === point.id)?.coords ?? null,
  );
  // A SCALAR selector: the name string is all the row needs.
  const layerName = useSceneStore(
    (s) => s.sceneLayers.find((candidate) => candidate.id === probe.layerId)?.name ?? "",
  );
  return (
    <div className="flex items-center gap-1.5 text-[10px]">
      <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: point.color }} />
      <span className="font-medium text-foreground/80">{comparedPointName(point)}</span>
      <span className="min-w-0 flex-1 truncate text-foreground/40">{layerName}</span>
      {lookup?.status === "loading" && <span className="text-foreground/40">…</span>}
      {lookup?.status === "error" && (
        <span className="truncate text-red-700/70 dark:text-red-300/70" title={lookup.error}>
          lookup failed
        </span>
      )}
      <span className="font-mono text-foreground/60">[{probe.voxelIndex.join(", ")}]</span>
      <ProbeTime layerId={probe.layerId} coords={pinnedCoords} compact />
      {onRemove ? (
        <button
          className="rounded px-1 text-foreground/50 hover:bg-foreground/15 hover:text-foreground"
          title="Remove this probe point"
          onClick={onRemove}
        >
          ×
        </button>
      ) : (
        // Keeps the voxel column aligned with the rows that have a ×.
        <span className="invisible px-1">×</span>
      )}
    </div>
  );
};

/** What the points on ONE layer measured: a row per channel, a column per point. */
const LayerValues = ({ layerId, points }: { layerId: string; points: readonly Reading[] }) => {
  const layer = useProbedLayer(layerId);
  const layerName = useSceneStore(
    (s) => s.sceneLayers.find((candidate) => candidate.id === layerId)?.name ?? "",
  );
  const rows = useMemo(() => {
    const labels = new Map<number, string>();
    for (const node of layer?.channels ?? []) {
      if (node.intensityIndex != null) labels.set(node.intensityIndex, node.label ?? "");
    }
    const channels = [
      ...new Set(points.flatMap((point) => point.probe.values.map((entry) => entry.channel))),
    ].sort((a, b) => a - b);
    const mesh = points.some((point) => point.probe.strategy === "mesh");
    return [
      ...channels.map((channel) => ({
        key: `channel-${channel}`,
        // A mesh pick: the "value" is the instance's object id.
        label: mesh ? "Instance" : labels.get(channel) || `Ch ${channel}`,
        cells: points.map(({ probe }) => {
          const entry = probe.values.find((candidate) => candidate.channel === channel);
          if (!entry) return "";
          return probe.strategy === "mesh"
            ? `#${entry.value ?? "…"}`
            : formatProbeValue(entry.value, probe.dtype);
        }),
      })),
      {
        key: "source",
        label: "read from",
        cells: points.map(({ probe }) => (
          <span className="font-sans text-foreground/40">{sourceOf(probe)}</span>
        )),
      },
    ];
  }, [layer?.channels, points]);

  return (
    <div className="space-y-1 rounded border border-foreground/10 bg-foreground/5 px-2 py-1.5">
      <span className="block truncate text-[10px] font-medium text-foreground/60">
        {layerName || "Values"}
      </span>
      <ComparisonGrid points={points.map((reading) => reading.point)} rows={rows} />
    </div>
  );
};

export const ProbePointList = () => {
  const points = useViewerStore((s) => s.probePoints);
  const clearProbePoints = useViewerStore((s) => s.clearProbePoints);
  const [lookups, setLookups] = useState<Readonly<Record<string, Lookup>>>({});
  const report = useCallback<Report>((pointId, lookup) => {
    setLookups((current) => {
      if (lookup === null) {
        if (!(pointId in current)) return current;
        const { [pointId]: _removed, ...rest } = current;
        return rest;
      }
      return current[pointId] === lookup ? current : { ...current, [pointId]: lookup };
    });
  }, []);

  // The SETTLED live probe (never the hot field, P17), its info readings
  // and the rows the tracker resolved for them.
  const liveProbe = useViewerStore((s) => s.probeReadout);
  const liveInfo = useViewerStore((s) => s.probeInfo);
  const liveAttributes = useViewerStore((s) => s.probedAttributes);
  const removeProbePoint = useViewerStore((s) => s.removeProbePoint);
  const live =
    liveProbe && !points.some((point) => isSameProbePoint(point.probe, liveProbe))
      ? liveProbe
      : null;
  const liveReadings = useMemo(
    () => (live === null ? [] : live.strategy === "mesh" ? [live] : liveInfo),
    [live, liveInfo],
  );

  /** One per point (and the live probe), at the HIT: the legend. */
  const columns = useMemo<readonly Reading[]>(
    () => [
      ...points.map((point) => ({ point: comparedPoint(point), probe: point.probe })),
      ...(live ? [{ point: LIVE_POINT, probe: live }] : []),
    ],
    [points, live],
  );

  /** One per point per layer read: the values. */
  const readings = useMemo<readonly Reading[]>(
    () => [
      ...points.flatMap((point) =>
        point.readings.map((reading) => ({ point: comparedPoint(point), probe: reading.probe })),
      ),
      ...liveReadings.map((probe) => ({ point: LIVE_POINT, probe })),
    ],
    [points, liveReadings],
  );

  const byLayer = useMemo(() => {
    const groups = new Map<string, Reading[]>();
    for (const reading of readings) {
      const group = groups.get(reading.probe.layerId);
      if (group) group.push(reading);
      else groups.set(reading.probe.layerId, [reading]);
    }
    return [...groups.entries()];
  }, [readings]);

  const compared = useMemo(() => {
    const pinned = points.flatMap((point) => {
      const blocks = point.readings.flatMap((reading) => {
        const lookup = lookups[lookupId(point.id, reading.probe.layerId)];
        return lookup?.status === "ready" ? lookup.blocks : [];
      });
      return blocks.length > 0 ? [{ point: comparedPoint(point), blocks }] : [];
    });
    const liveBlocks: HopBlock[] = liveReadings.flatMap((reading) => {
      const attributes = liveAttributes[reading.layerId];
      if (!attributes || !isSameProbeKey(reading, attributes.key)) return [];
      return Object.keys(attributes.byPlan).flatMap((hopKey) => {
        const meta = attributes.planMeta[hopKey];
        return meta ? [{ meta, state: attributes.byPlan[hopKey] }] : [];
      });
    });
    return compareHopBlocks(
      liveBlocks.length > 0 ? [...pinned, { point: LIVE_POINT, blocks: liveBlocks }] : pinned,
    );
  }, [points, lookups, liveReadings, liveAttributes]);

  if (points.length === 0) return null;
  const notLoaded = readings.some((reading) => reading.probe.provenance.source === "pending");

  return (
    <div className="mt-2 space-y-1.5 border-t border-foreground/10 pt-2">
      <div className="flex items-center justify-between gap-3 text-[10px] font-medium text-foreground/60">
        <span>Probe points</span>
        <button
          className="rounded border border-foreground/10 bg-foreground/5 px-1.5 py-0.5 text-[10px] text-foreground/70 hover:bg-foreground/15 hover:text-foreground"
          onClick={clearProbePoints}
        >
          Clear all
        </button>
      </div>

      {points.flatMap((point) =>
        point.readings.map(({ probe, lookup }) => {
          const id = lookupId(point.id, probe.layerId);
          return lookup === null ? null : lookup.instanceValue !== undefined ? (
            <MeshPointLookup
              key={id}
              pointId={id}
              lookup={lookup}
              instanceValue={lookup.instanceValue}
              report={report}
            />
          ) : (
            <VoxelPointLookup key={id} pointId={id} lookup={lookup} report={report} />
          );
        }),
      )}

      <div className="space-y-0.5">
        {columns.map((column) => {
          const point = points.find((candidate) => candidate.id === column.point.id);
          return !point ? (
            <LegendRow key={column.point.id} reading={column} />
          ) : (
            <LegendRow
              key={column.point.id}
              reading={column}
              lookup={pointLookup(point, lookups)}
              onRemove={() => removeProbePoint(column.point.id)}
            />
          );
        })}
      </div>

      {byLayer.map(([layerId, layerPoints]) => (
        <LayerValues key={layerId} layerId={layerId} points={layerPoints} />
      ))}
      {notLoaded && (
        <span className="block text-[10px] text-foreground/40">
          “not loaded”: the data there was not in memory yet when you clicked — click again to
          read it.
        </span>
      )}

      {compared.map((hop) => (
        <ComparedHopBlock key={hop.key} hop={hop} />
      ))}
    </div>
  );
};
