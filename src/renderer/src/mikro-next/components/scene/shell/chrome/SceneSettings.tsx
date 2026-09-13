import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Camera, Settings2 } from "lucide-react";
import { MikroCoordinateSystem } from "@/linkers";
import { layerDisplayLabel } from "../../platform/layerui/layerIdentity";
import { resolveProbeStrategy } from "../../platform/probe/probeModes";
import type { ProbeMode } from "../../platform/probe/probeTypes";
import { effectiveProbeLayerId, probeSystemIdFor } from "../../platform/probe/probeTargeting";
import { usePlansFor } from "@/mikro-next/lib/attributes/AttributeServiceProvider";
import {
  defaultEnabled,
  isHopEnabled,
  normalizeColumns,
  SPARSE_LIMIT_RANGE,
  type AttributeSelection,
} from "@/mikro-next/lib/attributes/attributeSelection";
import {
  hopMetaOf,
  isSparseHop,
  isTableHop,
  type AttributeHopLike,
  type AttributePlanLike,
  type TableHopLike,
} from "@/mikro-next/lib/attributes/attributeTypes";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useModeStore } from "../../platform/stores/modeStore";
import { LIGHT_RIG_RANGES } from "../../platform/gpu/shading";
import { VOLUME_POST_RANGES } from "../../platform/gpu/volumePost";
import { ProjectionMode } from "@/mikro-next/api/graphql";
import { identityOf } from "../../platform/model/objectIdentity";
import { useSceneStore, useSceneStoreApi } from "../../platform/stores/sceneStore";
import { useViewerStore } from "../../platform/stores/viewerStore";

const SettingRow = ({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) => (
  <div className="flex items-center justify-between gap-4 py-1">
    <span className="text-xs text-muted-foreground">{label}</span>
    <Switch checked={checked} onCheckedChange={onChange} />
  </div>
);

/** The label + mono value chip + slider shape used by every numeric setting
 * in this popover (probe threshold, iso threshold, the light rig). */
const SliderRow = ({
  label,
  value,
  min,
  max,
  step,
  decimals = 2,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  decimals?: number;
  onChange: (v: number) => void;
}) => (
  <div className="mt-2">
    <div className="flex items-center justify-between text-[10px] font-medium text-muted-foreground">
      <span>{label}</span>
      <span className="rounded bg-muted px-1 font-mono">{value.toFixed(decimals)}</span>
    </div>
    <Slider
      min={min}
      max={max}
      step={step}
      value={[value]}
      onValueChange={([next]) => onChange(next)}
      className="py-2"
    />
  </div>
);

/**
 * The CINEMATIC <-> SCIENTIFIC preset, and the light rig it enables.
 *
 * SCIENTIFIC (the default, and what this renderer has always been) means
 * screen value is a documented function of data value: no volume shading, no
 * filmic grading, no reconstruction filter. CINEMATIC adds all three.
 *
 * INVARIANT C1 — everything the preset gates is display-space. It never
 * touches clim, the transfer curve, gamma, the colormap or the projection
 * mode, so a probe reading is identical in both modes. See
 * `../../CINEMATIC_MODE.md`.
 *
 * The toggle stays ENABLED even when no layer would be shaded: `cinematic` is
 * scene-wide while `projection` is per-layer, and "disable it when it would do
 * nothing" needs a scene-to-layer coupling that does not exist and is not
 * worth building. The label carries the truth instead.
 */
const CinematicSection = () => {
  const cinematic = useModeStore((s) => s.cinematic);
  const setCinematic = useModeStore((s) => s.setCinematic);
  const lightRig = useModeStore((s) => s.lightRig);
  const setLightRig = useModeStore((s) => s.setLightRig);
  const resetLightRig = useModeStore((s) => s.resetLightRig);
  const post = useModeStore((s) => s.post);
  const setPost = useModeStore((s) => s.setPost);
  const resetPost = useModeStore((s) => s.resetPost);
  const isoThreshold = useModeStore((s) => s.isoThreshold);
  const setIsoThreshold = useModeStore((s) => s.setIsoThreshold);
  // The iso threshold defines the surface, so it is only meaningful when some
  // visible layer actually extracts one. A SCALAR selector (P9c/P17): only the
  // boolean matters here, and the `layers` array changes identity on every
  // per-tick layer edit.
  const hasIsosurface = useSceneStore((s) =>
    s.layers.some(
      (candidate) =>
        candidate.visible !== false && candidate.projection === ProjectionMode.Isosurface,
    ),
  );

  return (
    <div className="mt-1 border-t pt-1">
      <SettingRow label="Cinematic" checked={cinematic} onChange={setCinematic} />
      <p className="text-[10px] leading-4 text-muted-foreground">
        {cinematic
          ? "Lights every projection, with filmic grading. On MIP, brightness no longer reads as intensity."
          : "Faithful: unlit, no grading, no smoothing. Values map straight to screen."}
      </p>

      {hasIsosurface && (
        <SliderRow
          label="Iso threshold"
          value={isoThreshold}
          min={0}
          max={1}
          step={0.005}
          decimals={3}
          onChange={setIsoThreshold}
        />
      )}

      {cinematic && (
        <div className="mt-2 border-t pt-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium text-muted-foreground">
              Light rig
            </span>
            <button
              onClick={resetLightRig}
              className="rounded px-1 text-[10px] text-muted-foreground hover:text-foreground"
              title="Restore the default key + fill rig"
            >
              Reset
            </button>
          </div>
          <SliderRow
            label="Ambient"
            value={lightRig.ambient}
            {...LIGHT_RIG_RANGES.ambient}
            onChange={(ambient) => setLightRig({ ambient })}
          />
          <SliderRow
            label="Specular"
            value={lightRig.specular}
            {...LIGHT_RIG_RANGES.specular}
            onChange={(specular) => setLightRig({ specular })}
          />
          <SliderRow
            label="Shininess"
            value={lightRig.shininess}
            {...LIGHT_RIG_RANGES.shininess}
            decimals={0}
            onChange={(shininess) => setLightRig({ shininess })}
          />
          <SliderRow
            label="Surface gain"
            value={lightRig.surfaceGain}
            {...LIGHT_RIG_RANGES.surfaceGain}
            decimals={1}
            onChange={(surfaceGain) => setLightRig({ surfaceGain })}
          />
          {/* The MIP tradeoff, as a dial rather than a hardcoded choice. At 0 a
              max projection keeps its quantitative reading and gains only
              highlights; at 1 it is shaded exactly like a VOLUME layer and sits
              naturally beside one. Tune it against real data. */}
          <SliderRow
            label="MIP shading"
            value={lightRig.mipShading}
            {...LIGHT_RIG_RANGES.mipShading}
            onChange={(mipShading) => setLightRig({ mipShading })}
          />
          <p className="text-[10px] leading-4 text-muted-foreground">
            0 keeps MIP brightness equal to max intensity; 1 shades it like a volume.
          </p>

          {/* Post-processing. Applied to the VOLUME TARGET only, so it never
              touches the grid, axis, ROI outlines, track lines or handles —
              see platform/gpu/volumePost.ts. 3D only. It used to ride the
              `orkestrator.volumeTarget` kill switch (no target, no post); the
              compositor is now unconditional — OCTREE_RENDERER.md §6.9. */}
          <div className="mt-2 border-t pt-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-medium text-muted-foreground">
                Glow &amp; grading
              </span>
              <button
                onClick={resetPost}
                className="rounded px-1 text-[10px] text-muted-foreground hover:text-foreground"
                title="Restore the default glow and grading"
              >
                Reset
              </button>
            </div>
            <SliderRow
              label="Bloom"
              value={post.bloomStrength}
              {...VOLUME_POST_RANGES.bloomStrength}
              onChange={(bloomStrength) => setPost({ bloomStrength })}
            />
            <SliderRow
              label="Bloom radius"
              value={post.bloomRadius}
              {...VOLUME_POST_RANGES.bloomRadius}
              onChange={(bloomRadius) => setPost({ bloomRadius })}
            />
            <SliderRow
              label="Bloom threshold"
              value={post.bloomThreshold}
              {...VOLUME_POST_RANGES.bloomThreshold}
              onChange={(bloomThreshold) => setPost({ bloomThreshold })}
            />
            <SliderRow
              label="Saturation"
              value={post.saturation}
              {...VOLUME_POST_RANGES.saturation}
              onChange={(saturation) => setPost({ saturation })}
            />
            <SliderRow
              label="Vibrance"
              value={post.vibrance}
              {...VOLUME_POST_RANGES.vibrance}
              onChange={(vibrance) => setPost({ vibrance })}
            />
            <SliderRow
              label="Vignette"
              value={post.vignette}
              {...VOLUME_POST_RANGES.vignette}
              onChange={(vignette) => setPost({ vignette })}
            />
            <p className="text-[10px] leading-4 text-muted-foreground">
              3D only. Vignette dims real data at the frame edge.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

const PROBE_MODES: { mode: ProbeMode; label: string }[] = [
  { mode: "auto", label: "Auto" },
  { mode: "first-hit", label: "First hit" },
  { mode: "max", label: "Max" },
  { mode: "gradient", label: "Gradient" },
];

const STRATEGY_LABELS: Record<string, string> = {
  "first-hit": "first hit",
  max: "max intensity",
  gradient: "strongest gradient",
  "volume-accum": "opacity depth",
  plane: "plane",
};

/** How deep a hop sits in its plan's chain — the landing is 0. */
const hopDepth = (plan: AttributePlanLike, hop: AttributeHopLike): number => {
  let depth = 0;
  let current: AttributeHopLike | undefined = hop;
  while (current && current.parent !== null && current.parent !== undefined) {
    const parentIndex: number = current.parent;
    current = plan.hops.find((candidate) => candidate.index === parentIndex);
    depth += 1;
  }
  return depth;
};

/** The column checklist under an expanded TABLE hop. `null` = every column. */
const ColumnChecklist = ({
  hop,
  columns,
  onChange,
}: {
  hop: TableHopLike;
  columns: readonly string[] | null;
  onChange: (columns: readonly string[] | null) => void;
}) => {
  const names = hop.lookup.attributes.map((attribute) => attribute.name);
  const kept = new Set(columns ?? names);
  const toggle = (name: string) => {
    const next = names.filter((candidate) => (candidate === name ? !kept.has(name) : kept.has(candidate)));
    // Everything unticked is not "nothing": the last column stays selected.
    if (next.length === 0) return;
    onChange(normalizeColumns(hop, next));
  };
  return (
    <div className="ml-4 mt-0.5 space-y-0.5 border-l border-border/60 pl-2">
      {hop.lookup.attributes.map((attribute) => (
        <label
          key={attribute.name}
          className="flex cursor-pointer items-center gap-1.5 text-[10px] text-muted-foreground"
        >
          <input
            type="checkbox"
            className="h-3 w-3 accent-primary"
            checked={kept.has(attribute.name)}
            onChange={() => toggle(attribute.name)}
          />
          <span className="truncate">{attribute.longName ?? attribute.name}</span>
        </label>
      ))}
      {columns !== null && (
        <button
          className="text-[10px] text-primary/80 hover:text-primary"
          onClick={() => onChange(null)}
        >
          select all
        </button>
      )}
    </div>
  );
};

const HopRow = ({
  plan,
  hop,
  selection,
}: {
  plan: AttributePlanLike;
  hop: AttributeHopLike;
  selection: AttributeSelection;
}) => {
  const setHopEnabled = useViewerStore((s) => s.setHopEnabled);
  const setHopColumns = useViewerStore((s) => s.setHopColumns);
  const [open, setOpen] = useState(false);
  const meta = hopMetaOf(plan, hop);
  const parent =
    hop.parent === null || hop.parent === undefined
      ? null
      : plan.hops.find((candidate) => candidate.index === hop.parent) ?? null;
  const parentEnabled = parent === null || isHopEnabled(selection, plan, parent);
  const chosen = selection.hops[meta.hopKey]?.enabled ?? defaultEnabled(plan, hop);
  const columns = selection.hops[meta.hopKey]?.columns ?? null;
  const expandable = isTableHop(hop) && hop.lookup.attributes.length > 0;
  const narrowed = columns !== null && isTableHop(hop);

  return (
    <div style={{ paddingLeft: hopDepth(plan, hop) * 10 }}>
      <div className="flex items-center justify-between gap-2 py-0.5">
        <span className="flex min-w-0 items-center gap-1">
          {expandable ? (
            <button
              className="text-muted-foreground hover:text-foreground"
              onClick={() => setOpen((value) => !value)}
              title={open ? "Hide columns" : "Choose columns"}
            >
              {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </button>
          ) : (
            <span className="inline-block w-3" />
          )}
          <span className="truncate text-xs text-muted-foreground" title={meta.name}>
            {meta.name}
          </span>
          <span
            className={`rounded px-1 text-[9px] font-medium ${
              meta.kind === "SPARSE" ? "bg-sky-500/15 text-sky-600 dark:text-sky-300" : "bg-muted text-muted-foreground"
            }`}
          >
            {meta.kind === "SPARSE" ? "matrix" : "table"}
          </span>
          {meta.via && <span className="truncate text-[9px] text-muted-foreground/70">{meta.via}</span>}
          {narrowed && (
            <span className="text-[9px] text-muted-foreground/70">
              {columns.length}/{(hop as TableHopLike).lookup.attributes.length}
            </span>
          )}
        </span>
        <Switch
          checked={chosen && parentEnabled}
          disabled={!parentEnabled}
          onCheckedChange={(value) => setHopEnabled(meta.hopKey, value)}
          title={
            !parentEnabled
              ? "Switch on what this hop binds from first"
              : meta.kind === "SPARSE"
                ? "One object's whole profile — off by default"
                : undefined
          }
        />
      </div>
      {open && isTableHop(hop) && (
        <ColumnChecklist
          hop={hop}
          columns={columns}
          onChange={(next) => setHopColumns(meta.hopKey, next)}
        />
      )}
    </div>
  );
};

/** The plans of one system, one row per hop of each chain. */
const AttributeFetchGroup = ({ systemId, title }: { systemId: string; title: string }) => {
  const plans = usePlansFor(systemId);
  const selection = useViewerStore((s) => s.attributeSelection);
  if (plans === null) {
    return <p className="text-[10px] text-muted-foreground">{title}: discovering attributes…</p>;
  }
  if (plans.length === 0) {
    return <p className="text-[10px] text-muted-foreground">{title}: no attributes attached</p>;
  }
  return (
    <div>
      <div className="text-[10px] font-medium text-muted-foreground">{title}</div>
      {plans.map((plan) =>
        plan.hops.map((hop) => (
          <HopRow key={`${plan.edge.id}:${hop.index}`} plan={plan} hop={hop} selection={selection} />
        )),
      )}
    </div>
  );
};

/**
 * What a hover FETCHES. Lists every attribute plan of the probe's target
 * layer (and of each mesh/network collection in the scene, which a pick
 * probes), one row per hop of each chain: the landing table or matrix, then
 * the references it can cross. Each hop has a switch; a table hop unfolds to
 * a column checklist; matrices share one cap on how much of a profile is
 * kept. Choices persist per browser, keyed by the hop — the same data in
 * another scene remembers them.
 */
const AttributeFetchSection = ({ targetLayer }: { targetLayer: LayerStateLike | undefined }) => {
  const sceneStoreApi = useSceneStoreApi();
  const collectionsKey = useSceneStore((s) =>
    s.sceneLayers
      .map((layer) =>
        (layer.__typename === "MeshLayer" || layer.__typename === "NetworkLayer") &&
        layer.collection?.coordinateSystem?.id
          ? `${layer.id}:${layer.collection.coordinateSystem.id}:${layer.name ?? ""}`
          : "",
      )
      .filter(Boolean)
      .join("|"),
  );
  const groups = useMemo(() => {
    const out: { systemId: string; title: string }[] = [];
    const seen = new Set<string>();
    const targetSystem = targetLayer ? probeSystemIdFor(targetLayer) : null;
    if (targetLayer && targetSystem) {
      seen.add(targetSystem);
      out.push({ systemId: targetSystem, title: layerDisplayLabel(targetLayer) });
    }
    for (const layer of sceneStoreApi.getState().sceneLayers) {
      if (layer.__typename !== "MeshLayer" && layer.__typename !== "NetworkLayer") continue;
      const systemId = layer.collection?.coordinateSystem?.id;
      if (!systemId || seen.has(systemId)) continue;
      seen.add(systemId);
      out.push({ systemId, title: layer.name ?? layer.__typename });
    }
    return out;
    // The key STANDS FOR the scene layers read via getState().
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionsKey, targetLayer, sceneStoreApi]);
  const selection = useViewerStore((s) => s.attributeSelection);
  const setSparseLimit = useViewerStore((s) => s.setSparseLimit);
  const plansOfFirst = usePlansFor(groups[0]?.systemId ?? null);
  const anySparse = (plansOfFirst ?? []).some((plan) => plan.hops.some(isSparseHop));

  if (groups.length === 0) return null;
  return (
    <div className="mt-2">
      <div className="text-[10px] font-medium text-muted-foreground">Attributes on hover</div>
      <div className="mt-1 space-y-1">
        {groups.map((group) => (
          <AttributeFetchGroup key={group.systemId} systemId={group.systemId} title={group.title} />
        ))}
      </div>
      {anySparse && (
        <SliderRow
          label="Matrix entries kept"
          value={selection.sparseLimit}
          min={SPARSE_LIMIT_RANGE.min}
          max={SPARSE_LIMIT_RANGE.max}
          step={SPARSE_LIMIT_RANGE.step}
          decimals={0}
          onChange={setSparseLimit}
        />
      )}
    </div>
  );
};

type LayerStateLike = Parameters<typeof layerDisplayLabel>[0] & Parameters<typeof probeSystemIdFor>[0];

/**
 * How the probe BEHAVES — target layer, march strategy, threshold. Moved out
 * of the probe HUD so the readout can be just the reading; these are settings,
 * and this popover is where the scene's settings live.
 */
const ProbeSettingsSection = () => {
  const displayMode = useModeStore((s) => s.displayMode);
  const probeMode = useViewerStore((s) => s.probeMode);
  const setProbeMode = useViewerStore((s) => s.setProbeMode);
  const probeThreshold = useViewerStore((s) => s.probeThreshold);
  const setProbeThreshold = useViewerStore((s) => s.setProbeThreshold);
  const probeLayerId = useViewerStore((s) => s.probeLayerId);
  const setProbeLayerId = useViewerStore((s) => s.setProbeLayerId);
  const sceneStoreApi = useSceneStoreApi();
  // A SCALAR key over exactly what this section reads per layer (P9c/P17):
  // identity + display-label inputs for the picker, visibility, and the
  // projection the strategy resolves against. `layersPlanKey` won't do here —
  // it deliberately ignores `projection` and `name` — and subscribing to the
  // array re-rendered this popover on every per-tick layer edit.
  const layersKey = useSceneStore((s) =>
    s.layers
      .map(
        (l) =>
          `${l.id}:${l.visible === false ? 0 : 1}:${l.projection ?? ""}:${
            l.name ?? ""
          }:${l.__typename}:${identityOf(l.lens)}:${l.phasors.length}:${l.channels.length}`,
      )
      .join("|"),
  );

  // Both brick layers bail on `visible === false`, so a hidden layer cannot
  // answer a probe (`features/annotations/modeCompat.ts`). An alive explicit pin drives the
  // picker's value; a dead pin (hidden/gone layer) shows as Auto WITHOUT being
  // erased — it heals by derivation and resurrects if its layer comes back.
  //
  // The strategy resolves against the layer that will ANSWER the next probe —
  // the effective target — since this section configures future probes, not a
  // reading that already happened.
  const { probeableLayers, pinnedLayer, targetLayer } = useMemo(() => {
    const { layers } = sceneStoreApi.getState();
    const probeableLayers = layers.filter((candidate) => candidate.visible !== false);
    const pinnedLayer =
      probeLayerId !== null
        ? layers.find(
            (candidate) => candidate.id === probeLayerId && candidate.visible !== false,
          )
        : undefined;
    const targetId = effectiveProbeLayerId(probeLayerId, layers);
    const targetLayer = layers.find((candidate) => candidate.id === targetId);
    return { probeableLayers, pinnedLayer, targetLayer };
    // The key STANDS FOR the layers array read via getState().
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layersKey, probeLayerId, sceneStoreApi]);
  const resolved = resolveProbeStrategy(
    probeMode,
    targetLayer?.projection,
    probeThreshold,
  );
  // The slider matters only where the march actually consumes it: 3D, an
  // effective first-hit strategy, and not the iso override.
  const showThreshold =
    displayMode === "3D" &&
    resolved.strategy === "first-hit" &&
    resolved.threshold === probeThreshold;

  return (
    <div className="mt-1 border-t pt-1">
      <div className="py-1 text-xs font-medium">Probe</div>

      {/* Which layer the probe reads. Exactly one layer answers — Auto follows
          the first visible layer; picking one pins it explicitly (it sticks
          through reorders). */}
      <select
        value={pinnedLayer?.id ?? ""}
        onChange={(event) =>
          setProbeLayerId(event.target.value === "" ? null : event.target.value)
        }
        className="h-6 w-full min-w-0 rounded border bg-transparent px-1 text-xs"
        title="Which layer the probe reads"
      >
        <option value="">
          {probeableLayers[0]
            ? `Auto — first layer (${layerDisplayLabel(probeableLayers[0])})`
            : "Auto — no visible layer"}
        </option>
        {probeableLayers.map((candidate) => (
          <option key={candidate.id} value={candidate.id}>
            {layerDisplayLabel(candidate)}
          </option>
        ))}
      </select>

      {displayMode === "3D" && (
        <div className="mt-2">
          <div className="grid grid-cols-4 gap-0.5 rounded bg-muted p-0.5">
            {PROBE_MODES.map(({ mode, label }) => (
              <button
                key={mode}
                onClick={() => setProbeMode(mode)}
                className={`rounded px-1 py-0.5 text-[10px] transition-colors ${
                  probeMode === mode
                    ? "bg-background font-medium shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {probeMode === "auto" && (
            <p className="mt-1 text-[10px] leading-4 text-muted-foreground">
              Following the projection: {STRATEGY_LABELS[resolved.strategy]}.
            </p>
          )}
        </div>
      )}

      {showThreshold && (
        <div className="mt-2">
          <div className="flex items-center justify-between text-[10px] font-medium text-muted-foreground">
            <span>Threshold</span>
            <span className="rounded bg-muted px-1 font-mono">
              {probeThreshold.toFixed(3)}
            </span>
          </div>
          <Slider
            min={0}
            max={1}
            step={0.005}
            value={[probeThreshold]}
            onValueChange={([value]) => setProbeThreshold(value)}
            className="py-2"
          />
        </div>
      )}

      <AttributeFetchSection targetLayer={targetLayer} />
    </div>
  );
};

/**
 * Everything you can change about how the scene is DRAWN, behind one gear.
 *
 * This used to be a card floating in the foldable left column, which put view
 * settings in a different corner from the mode controls that they read as part
 * of. It is now a bare button — no card, no positioning of its own — so it
 * composes into the bottom-right HUD row in `SceneModeControls`, next to the
 * display toggle. The screenshot moved inside the popover for the same reason:
 * one button in the HUD rather than two.
 */
export const SceneSettings = () => {
  const displayMode = useModeStore((s) => s.displayMode);
  const zoomToCursor = useModeStore((s) => s.zoomToCursor);
  const pivotOnProbe = useModeStore((s) => s.pivotOnProbe);
  const smoothOrbit = useModeStore((s) => s.smoothOrbit);
  const setZoomToCursor = useModeStore((s) => s.setZoomToCursor);
  const setPivotOnProbe = useModeStore((s) => s.setPivotOnProbe);
  const setSmoothOrbit = useModeStore((s) => s.setSmoothOrbit);
  const isDebug = useViewerStore((state) => state.debug);
  const world = useSceneStore(
    (state) => state.transformContext.worldCoordinateSystem,
  );
  const showScaleBar = useViewerStore((state) => state.showScaleBar);
  const showScaleGrid = useViewerStore((state) => state.showScaleGrid);
  const showSceneAxis = useViewerStore((state) => state.showSceneAxis);
  const showLodReadout = useViewerStore((state) => state.showLodReadout);

  const setDebug = useViewerStore((state) => state.setDebug);
  const setShowScaleBar = useViewerStore((state) => state.setShowScaleBar);
  const setShowScaleGrid = useViewerStore((state) => state.setShowScaleGrid);
  const setShowSceneAxis = useViewerStore((state) => state.setShowSceneAxis);
  const setShowLodReadout = useViewerStore((state) => state.setShowLodReadout);

  const captureScreenshot = useViewerStore((state) => state.captureScreenshot);

  // Capture the current 3D scene (layers + in-scene axis/grid, not HTML overlays
  // or the gizmo) and save it as a PNG via the standard <a download> pattern.
  const onScreenshot = async () => {
    if (!captureScreenshot) return;
    const blob = await captureScreenshot();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${world?.name ?? "scene"}-screenshot.png`;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={isDebug ? "destructive" : "outline"}
          size={"xs"}
          className={isDebug ? "h-7 w-8 p-0" : "h-7 w-8 bg-black p-0"}
          title="View settings"
        >
          <Settings2 className="h-3.5 w-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56">
        {/* An action, not a setting — but it belongs to the same question
            ("what does this view look like?"), and it is one click too rare to
            spend a permanent slot in the HUD on. */}
        <Button
          variant={"outline"}
          size={"xs"}
          className="mb-1 h-7 w-full justify-start gap-2"
          onClick={onScreenshot}
          disabled={!captureScreenshot}
          title="Save a PNG screenshot of the current view"
        >
          <Camera className="h-3.5 w-3.5" />
          <span className="text-xs">Save screenshot</span>
        </Button>

        <div className="border-t pt-1">
          <SettingRow
            label="Scale bar"
            checked={showScaleBar}
            onChange={setShowScaleBar}
          />
          <SettingRow
            label="Grid"
            checked={showScaleGrid}
            onChange={setShowScaleGrid}
          />
          <SettingRow
            label="Origin axis"
            checked={showSceneAxis}
            onChange={setShowSceneAxis}
          />
          <SettingRow
            label="LOD readout"
            checked={showLodReadout}
            onChange={setShowLodReadout}
          />
          <SettingRow label="Debug" checked={isDebug} onChange={setDebug} />
        </div>

        {/* Camera behaviour. The pivot/zoom pair used to be exclusive camera
            modes; as switches they compose, so you can orbit around the probe
            *and* zoom to the cursor. Rotation is 2D-disabled, so those two are
            3D-only — but smoothing damps panning and dollying as well, so it
            is offered in both modes. */}
        <div className="mt-1 border-t pt-1">
          <SettingRow
            label="Smooth camera"
            checked={smoothOrbit}
            onChange={setSmoothOrbit}
          />
          {displayMode === "3D" && (
            <>
              <SettingRow
                label="Zoom to cursor"
                checked={zoomToCursor}
                onChange={setZoomToCursor}
              />
              <SettingRow
                label="Orbit around probe"
                checked={pivotOnProbe}
                onChange={setPivotOnProbe}
              />
            </>
          )}
        </div>

        <CinematicSection />

        <ProbeSettingsSection />

        {world && (
          <div className="mt-1 flex items-center justify-between gap-2 border-t pt-2">
            <span className="text-xs text-muted-foreground">World</span>
            <MikroCoordinateSystem.DetailLink
              object={{ id: world.id }}
              title="The scene's world coordinate system — the space every layer is registered into"
              className="truncate font-mono text-xs"
            >
              {world.name ?? world.id}
            </MikroCoordinateSystem.DetailLink>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};
