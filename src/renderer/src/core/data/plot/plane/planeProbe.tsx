import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { usePlaneStore, usePlaneStoreApi } from "./planeStore";
import { pixelOf } from "./planeView";
import { formatSiValue } from "../coords/siFormat";

/**
 * Hover readout for a plane. Each layer registers a PROBE -- "what of mine is
 * under this point?" -- and the tooltip asks every probe at the hovered point
 * and shows the nearest answer. A layer keeps its own lookup structure (a point
 * index, its bins, its boxes); the tooltip knows none of them.
 */

export type PlaneHit = {
  layerId: string;
  /** The headline: a layer and what the hit is (a row, a bin, a group). */
  title: string;
  color: string;
  /** Label/value pairs, already formatted. */
  rows: readonly (readonly [string, string])[];
  /** How far from the cursor, in pixels; 0 for "the cursor is inside it". */
  distancePx: number;
  /** Where to ring the hit, in data space; null for an area hit (a bar, a cell). */
  at: { x: number; y: number } | null;
  /** More about the hit, read on demand (the rest of a row); keyed so a pause fetches it once. */
  detail?: { key: string; load: () => Promise<readonly (readonly [string, string])[]> };
  /**
   * WHICH row the hit is, where the layer knows: its table and its id (the
   * table's INDEX value). What a click pins, and what a probe then follows.
   */
  pick?: { table: string; id: number | bigint | string };
};

export type PlaneProbe = (at: { x: number; y: number }, scale: { pxPerX: number; pxPerY: number }) => PlaneHit | null;

type Registry = { probes: Map<string, PlaneProbe> };

const ProbeContext = createContext<Registry | null>(null);

export const PlaneProbeProvider = ({ children }: { children: ReactNode }) => {
  const registry = useMemo<Registry>(() => ({ probes: new Map() }), []);
  return <ProbeContext.Provider value={registry}>{children}</ProbeContext.Provider>;
};

/** Register a layer's probe for as long as the layer is mounted. The probe may change identity freely. */
export const usePlaneProbe = (layerId: string, probe: PlaneProbe | null) => {
  const registry = useContext(ProbeContext);
  useEffect(() => {
    if (!registry) return;
    if (probe) registry.probes.set(layerId, probe);
    else registry.probes.delete(layerId);
    return () => {
      registry.probes.delete(layerId);
    };
  }, [registry, layerId, probe]);
};

/** The nearest hit among every probe, within `maxPx`. */
const probeAll = (registry: Registry, at: { x: number; y: number }, scale: { pxPerX: number; pxPerY: number }, maxPx: number): PlaneHit | null => {
  let best: PlaneHit | null = null;
  for (const probe of registry.probes.values()) {
    const hit = probe(at, scale);
    if (!hit || hit.distancePx > maxPx) continue;
    if (!best || hit.distancePx < best.distancePx) best = hit;
  }
  return best;
};

/**
 * Ask every probe of this plane what is nearest a point in data space — what
 * the tooltip shows, for a host that acts on it (a click pins it). Reads the
 * view when called, so it never re-renders anything.
 */
export const usePlaneProbeAt = (maxPx = 24) => {
  const registry = useContext(ProbeContext);
  const plane = usePlaneStoreApi();
  return useCallback(
    (at: { x: number; y: number }): PlaneHit | null => {
      if (!registry) return null;
      const { live, sizePx } = plane.getState();
      const scale = { pxPerX: sizePx.width / (live.x1 - live.x0), pxPerY: sizePx.height / (live.y1 - live.y0) };
      return probeAll(registry, at, scale, maxPx);
    },
    [registry, plane, maxPx],
  );
};

const DETAIL_DELAY_MS = 180;

/**
 * The tooltip: the nearest hit's values beside the cursor, a ring on a point
 * hit, and the cursor's own coordinates in the corner when nothing is near.
 * Re-renders at hover rate, which is once per frame at most and only while the
 * pointer moves -- a few DOM nodes.
 */
export const PlaneTooltip = ({ maxPx = 24, xLabel, yLabel }: { maxPx?: number; xLabel?: string | null; yLabel?: string | null }) => {
  const registry = useContext(ProbeContext);
  const hover = usePlaneStore((s) => s.hover);
  const live = usePlaneStore((s) => s.live);
  const size = usePlaneStore((s) => s.sizePx);

  const hit = useMemo(() => {
    if (!registry || !hover) return null;
    const scale = { pxPerX: size.width / (live.x1 - live.x0), pxPerY: size.height / (live.y1 - live.y0) };
    return probeAll(registry, hover, scale, maxPx);
  }, [registry, hover, live, size, maxPx]);

  const detail = useDetail(hit?.detail ?? null);

  if (!hover) return null;
  if (!hit) {
    return (
      <div className="absolute bottom-1 right-1 rounded bg-black/60 px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-foreground/60">
        {xLabel ? `${xLabel} ` : "x "}
        {formatSiValue(hover.x)} · {yLabel ? `${yLabel} ` : "y "}
        {formatSiValue(hover.y)}
      </div>
    );
  }

  const ring = hit.at ? pixelOf(live, size, hit.at.x, hit.at.y) : null;
  // Flip to the other side of the cursor near the right and bottom edges.
  const left = hover.px > size.width - 220;
  const up = hover.py > size.height - 140;
  return (
    <>
      {ring && (
        <div
          className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.6)]"
          style={{ left: ring.px, top: ring.py }}
        />
      )}
      <div
        className="absolute z-10 min-w-36 max-w-72 rounded-md border border-white/10 bg-zinc-950/90 px-2 py-1.5 text-[11px] shadow-lg backdrop-blur"
        style={{
          left: left ? undefined : hover.px + 14,
          right: left ? size.width - hover.px + 14 : undefined,
          top: up ? undefined : hover.py + 14,
          bottom: up ? size.height - hover.py + 14 : undefined,
        }}
      >
        <div className="mb-1 flex items-center gap-1.5 font-medium text-foreground/90">
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: hit.color }} />
          <span className="truncate">{hit.title}</span>
        </div>
        <Pairs rows={hit.rows} />
        {detail && detail.length > 0 && (
          <div className="mt-1 border-t border-white/10 pt-1">
            <Pairs rows={detail} muted />
          </div>
        )}
      </div>
    </>
  );
};

const Pairs = ({ rows, muted }: { rows: readonly (readonly [string, string])[]; muted?: boolean }) => (
  <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
    {rows.map(([label, value]) => (
      <div key={label} className="contents">
        <span className={`truncate ${muted ? "text-foreground/40" : "text-foreground/55"}`}>{label}</span>
        <span className={`truncate text-right font-mono tabular-nums ${muted ? "text-foreground/60" : "text-foreground/90"}`}>{value}</span>
      </div>
    ))}
  </div>
);

/** A hit's detail, fetched once the pointer rests on the same hit; dropped when it moves on. */
const useDetail = (detail: PlaneHit["detail"] | null) => {
  const [loaded, setLoaded] = useState<{ key: string; rows: readonly (readonly [string, string])[] } | null>(null);
  const cache = useRef(new Map<string, readonly (readonly [string, string])[]>());
  const key = detail?.key ?? null;
  const loadRef = useRef(detail?.load);
  useEffect(() => {
    loadRef.current = detail?.load;
  });

  useEffect(() => {
    if (!key) return;
    const cached = cache.current.get(key);
    if (cached) {
      setLoaded({ key, rows: cached });
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      const load = loadRef.current;
      if (!load) return;
      load()
        .then((rows) => {
          if (cache.current.size > 200) cache.current.clear();
          cache.current.set(key, rows);
          if (!cancelled) setLoaded({ key, rows });
        })
        .catch(() => undefined);
    }, DETAIL_DELAY_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [key]);

  return loaded && loaded.key === key ? loaded.rows : null;
};
