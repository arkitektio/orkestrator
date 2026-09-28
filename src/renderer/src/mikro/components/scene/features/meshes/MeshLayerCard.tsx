import { effectiveFlatNormals } from "./meshLayerDefaults";
import { Button } from "@/core/ui/button";
import {
  Box,
  Crosshair,
  Eye,
  EyeOff,
  FlipHorizontal2,
  Grid3x3,
  Save,
  Trash2,
  Waves,
  X,
} from "lucide-react";
import { memo, useCallback, useMemo, useRef, useState } from "react";
import {
  useUpdateMeshLayerMutation,
  type SceneLayerFragment,
} from "@/mikro/api/graphql";
import {
  DEFAULT_INSTANCE_COLORMAP,
  INSTANCE_COLORMAPS,
  instanceHue,
  type FabriksInstanceColormap,
} from "../../platform/gpu/instanceColormaps";
import { perfMonitor } from "../../platform/perf/perfMonitor";
import { useSceneStore, type MeshLayerSessionState } from "../../platform/stores/sceneStore";
import {
  Badge,
  CardSection,
  IconToggle,
  LayerCardShell,
  OpacityRow,
  Segment,
  SegmentGroup,
  formatCount,
} from "@/core/data/scene/layerui/cardControls";
import { instancePaletteCSS } from "../../platform/layerui/colormap-utils";
import { ColormapSelect, type ColormapChoice } from "@/core/data/scene/layerui/ColormapSelect";
import { useViewerStore } from "../../platform/stores/viewerStore";
import {
  ColorBySection,
  FilterBySection,
  type DefaultColorRow,
  type EntriesPatch,
  type PickPatch,
} from "../../platform/layerui/entrySections";
import { type ColumnOptionSource } from "../../platform/layerui/ColumnOptionPicker";
import { colorByEntryToInput, filterByEntryToInput } from "../../platform/layerui/columnOptions";
import { useMeshStore } from "./store/meshSlice";

/**
 * A compact card for a `MeshLayer` in the Layers panel.
 *
 * Two kinds of control live here, and the difference is worth keeping straight:
 *  - SESSION-LOCAL (`patchSceneLayer` only): the render settings — palette,
 *    detail, normals, slab, wireframe, visibility. `updateLayer` is typed to
 *    return `ImageLayer`, so none of these has anywhere to be stored.
 *  - STORED (`updateMeshLayer`): the picker entries and choices the layer
 *    publishes (`colorBys`/`filterBys`, `activeColorBy`/`activeFilterBys`).
 *    The layer offers candidates (server-checked against the collection's
 *    FIELD edge); the entries and the choice belong to the layer rather than
 *    to this session — but they are NOT written per edit. Edits fold into the
 *    local store (live preview) and mark the card dirty; the header's Save
 *    button is the one server write, the image layer card's contract.
 *
 * The fold after the save is not optional: `SceneProvider` reconciles the
 * layer set by structure, so a `GetScene` re-emission that changed only a mesh
 * layer's CONTENT keeps the stored object as-is. Content mutations land in the
 * store at their call site — see the rebuild contract in `SceneProvider`.
 *
 * RE-RENDER SHAPE (the reason this file is a stack of module-level memo
 * components rather than one big body): the card re-runs whenever its `layer`
 * prop changes — which is every opacity tick — and every section below it is
 * a memo boundary that skips unless ITS slice changed. That only works if
 * everything crossing a boundary is stable: the persistence callbacks read
 * their rollback state through a ref instead of closing over it, the
 * `source`/`defaultRow` objects are memoized, and the sections that display
 * store-driven state (the instance selection) subscribe to that store
 * THEMSELVES with a layer-narrowed selector instead of the card subscribing
 * for them — so another layer's selection does not touch this card at all.
 */

type MeshLayerVariant = Extract<SceneLayerFragment, { __typename: "MeshLayer" }> &
  MeshLayerSessionState;

/** `store.counts` is the manifest's own tally, mirrored by the API. */
type FabriksCounts = { objects?: number; cellsPerLevel?: number[] };

const DETAIL_PRESETS = ["fine", "balanced", "fast"] as const;
const SLAB_SCALES = [1, 3, 5] as const;

/* ------------------------------------------------------------------ render */

/**
 * The session render settings. All primitives + the store's stable patch
 * function, so it re-renders only when one of the settings themselves flips.
 */
const MeshRenderSection = memo(function MeshRenderSection({
  layerId,
  detail,
  flatNormals,
  doubleSided,
  slabScale,
}: {
  layerId: string;
  detail: MeshLayerVariant["detail"];
  flatNormals: MeshLayerVariant["flatNormals"];
  doubleSided: MeshLayerVariant["doubleSided"];
  slabScale: MeshLayerVariant["slabScale"];
}) {
  perfMonitor.countRender("MeshRenderSection"); // no-op unless a perf recording is armed
  const patchSceneLayer = useSceneStore((s) => s.patchSceneLayer);
  return (
    <CardSection title="render">
      <div className="flex flex-wrap items-center gap-1.5">
        <SegmentGroup>
          {DETAIL_PRESETS.map((preset) => (
            <Segment
              key={preset}
              active={(detail ?? "balanced") === preset}
              title={`LOD budget: ${preset} (${{ fine: "2", balanced: "4", fast: "8" }[preset]} px screen error)`}
              onClick={() => patchSceneLayer(layerId, { detail: preset })}
            >
              {preset}
            </Segment>
          ))}
        </SegmentGroup>
        <IconToggle
          active={flatNormals === false}
          title="Smooth normals (computed per cell in the decode workers; toggling retrofits the cached cells on the main thread)"
          onClick={() => patchSceneLayer(layerId, { flatNormals: flatNormals === false })}
          icon={<Waves className="h-2.5 w-2.5" />}
          label="smooth"
        />
        <IconToggle
          active={doubleSided !== false}
          title="Render both faces (off = front faces only; interiors disappear through openings)"
          onClick={() => patchSceneLayer(layerId, { doubleSided: doubleSided === false })}
          icon={<FlipHorizontal2 className="h-2.5 w-2.5" />}
          label="two-sided"
        />
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-[9px] uppercase tracking-[0.08em] text-white/35">slab</span>
        <SegmentGroup>
          {SLAB_SCALES.map((scale) => (
            <Segment
              key={scale}
              active={(slabScale ?? 1) === scale}
              title="2D cross-section thickness, × the scene's z-step (2D view only)"
              onClick={() => patchSceneLayer(layerId, { slabScale: scale })}
            >
              ×{scale}
            </Segment>
          ))}
        </SegmentGroup>
      </div>
    </CardSection>
  );
});

/* ---------------------------------------------------------------- instance */

/**
 * The instance selection block. It subscribes to the viewer store ITSELF,
 * with a selector narrowed to this layer — another layer's selection maps to
 * the same `null` and never re-renders this card — and it owns the id-query
 * draft, so typing in the input re-renders this section alone.
 */
const MeshInstanceSection = memo(function MeshInstanceSection({
  layerId,
}: {
  layerId: string;
}) {
  perfMonitor.countRender("MeshInstanceSection"); // no-op unless a perf recording is armed
  const selected = useViewerStore((s) =>
    s.meshSelection?.layerId === layerId ? s.meshSelection : null,
  );
  const setMeshSelection = useViewerStore((s) => s.setMeshSelection);
  const manager = useMeshStore((s) => s.meshSystems[layerId]);
  const [idQuery, setIdQuery] = useState("");

  const selectById = () => {
    const objectId = Number(idQuery);
    if (!manager || !Number.isFinite(objectId)) return;
    void manager
      .identifyObjectId(objectId)
      .then((entry) => {
        if (!entry) return;
        setMeshSelection({
          layerId,
          ordinal: entry.ordinal,
          objectId: entry.objectId,
          stats: { vertices: entry.vertexCount, indices: entry.indexCount },
          isolate: selected?.isolate ?? false,
        });
      })
      .catch((error) => console.warn("[fabriks] select-by-id failed:", error));
  };

  return (
    <CardSection title="instance">
      <div className="flex flex-wrap items-center gap-1.5">
        {selected ? (
          <>
            <span
              className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-mono text-[9px] leading-none text-white"
              style={{
                background: `hsla(${instanceHue(selected.ordinal) * 360}, 70%, 45%, 0.35)`,
                border: `1px solid hsla(${instanceHue(selected.ordinal) * 360}, 80%, 60%, 0.6)`,
              }}
            >
              <Crosshair className="h-2.5 w-2.5" />
              {selected.objectId !== null ? `#${selected.objectId}` : `ord ${selected.ordinal}`}
            </span>
            {selected.stats && (
              <span className="text-[9px] text-white/40">
                {formatCount(selected.stats.vertices)}v ·{" "}
                {formatCount(Math.round(selected.stats.indices / 3))}t
              </span>
            )}
            <IconToggle
              active={selected.isolate}
              title="Show ONLY this instance"
              onClick={() => setMeshSelection({ ...selected, isolate: !selected.isolate })}
              icon={<Box className="h-2.5 w-2.5" />}
              label="isolate"
            />
            <button
              title="Clear selection"
              onClick={() => setMeshSelection(null)}
              className="grid h-4 w-4 place-items-center rounded text-white/40 transition-colors hover:bg-white/10 hover:text-white/80"
            >
              <X className="h-3 w-3" />
            </button>
          </>
        ) : (
          <>
            <input
              value={idQuery}
              onChange={(event) => setIdQuery(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && selectById()}
              placeholder="object id"
              className="h-5 w-16 rounded-md border border-white/10 bg-black/30 px-1.5 text-[9px] text-white/80 outline-none transition-colors placeholder:text-white/25 focus:border-sky-400/40"
            />
            <IconToggle
              active={false}
              title="Select by object id"
              onClick={selectById}
              icon={<Crosshair className="h-2.5 w-2.5" />}
              label="select"
            />
            <span className="text-[9px] text-white/25">or click a mesh in probe mode</span>
          </>
        )}
      </div>
    </CardSection>
  );
});

/* ------------------------------------------------------------------- stats */

/**
 * What the collection actually is, read off the store's mirrored manifest —
 * so this costs no request and cannot disagree with what the renderer
 * streams. The `store` object is a stable fragment reference, so this
 * effectively renders once.
 */
const MeshStatsFooter = memo(function MeshStatsFooter({
  store,
}: {
  store: NonNullable<NonNullable<MeshLayerVariant["collection"]>["store"]>;
}) {
  const counts = (store.counts ?? {}) as FabriksCounts;
  const grid = (store.grid ?? {}) as { cellSize?: number[]; levels?: number };
  const encoding = (store.encoding ?? {}) as { codec?: string; compression?: string };
  const cellsPerLevel = counts.cellsPerLevel ?? [];
  const totalCells = cellsPerLevel.reduce((sum, n) => sum + n, 0);
  return (
    <div className="flex flex-wrap items-center gap-1 border-t border-white/5 px-2 py-1">
      {counts.objects !== undefined && (
        <Badge title="Objects in the collection">{formatCount(counts.objects)} objects</Badge>
      )}
      {totalCells > 0 && (
        <Badge title={`Cells per level, finest first: ${cellsPerLevel.join(", ")}`}>
          {formatCount(totalCells)} cells
        </Badge>
      )}
      {grid.levels !== undefined && <Badge title="Octree levels">{grid.levels} levels</Badge>}
      {grid.cellSize && (
        <Badge title="Cell size in voxels, per vertex component">
          {grid.cellSize.join("×")}
        </Badge>
      )}
      {encoding.codec && encoding.codec !== "NONE" && <Badge>{encoding.codec}</Badge>}
      {store.specVersion && (
        <Badge title="fabriks spec version">fabriks v{store.specVersion}</Badge>
      )}
    </div>
  );
});

/* -------------------------------------------------------------------- card */

export const MeshLayerCard = memo(
  ({
    layer,
    expanded,
    onSelect,
    onRemove,
  }: {
    layer: MeshLayerVariant;
    /** Whether the card's controls are unfolded (`LayerCardShell`). */
    expanded: boolean;
    /** The panel's toggle — handed the current state, see `cardShell.tsx`. */
    onSelect: (id: string, currentlyExpanded: boolean) => void;
    onRemove?: (id: string) => void;
  }) => {
    perfMonitor.countRender("MeshLayerCard"); // no-op unless a perf recording is armed
    const patchSceneLayer = useSceneStore((s) => s.patchSceneLayer);
    const [updateMeshLayer, { loading: saving }] = useUpdateMeshLayerMutation();
    const layerId = layer.id;
    const hidden = layer.visible === false;
    const collection = layer.collection;

    const byInstance = layer.colorByInstance !== false;
    const activePalette = layer.instanceColormap ?? DEFAULT_INSTANCE_COLORMAP;
    const uniformCSS = layer.materialColor
      ? `rgb(${layer.materialColor[0] ?? 0}, ${layer.materialColor[1] ?? 0}, ${layer.materialColor[2] ?? 0})`
      : "rgb(184, 184, 194)";

    // Memoized: the `?? []` mints a new array every render, which would break
    // the sections' memo boundaries on every one of them.
    const colorBys = useMemo(() => layer.colorBys ?? [], [layer.colorBys]);
    const filterBys = useMemo(() => layer.filterBys ?? [], [layer.filterBys]);
    const activeColorBy = layer.activeColorBy ?? null;
    const activeFilterBys = useMemo(
      () => layer.activeFilterBys ?? [],
      [layer.activeFilterBys],
    );

    /**
     * NO server write per edit — the image layer card's contract, adopted
     * here: every picker edit folds into the LOCAL store only (the renderer
     * reads it there, so the preview is live), the card turns dirty, and the
     * header's Save button is the one thing that talks to the server.
     *
     * The store therefore holds input-shaped entries between an edit and its
     * save — structurally compatible with the fragments every consumer reads
     * (`entryKey`, the LUT painter, the settings editor are all structural) —
     * and the server's normalised answer (labels filled, joins normalised)
     * folds in when Save round-trips.
     */
    const [dirty, setDirty] = useState(false);

    // The CURRENT stored state for `save`, read at CALL time through a ref so
    // the callbacks below never change identity — the sections' memo depends
    // on that.
    const stateRef = useRef({ colorBys, filterBys, activeColorBy, activeFilterBys });
    stateRef.current = { colorBys, filterBys, activeColorBy, activeFilterBys };

    /** The two picker choices: fold locally, mark dirty. */
    const persistPick = useCallback(
      (patch: PickPatch) => {
        patchSceneLayer(layerId, patch);
        setDirty(true);
      },
      [layerId, patchSceneLayer],
    );

    /** The picker contents: same local fold — Save does the round trip. */
    const persistEntries = useCallback(
      (patch: EntriesPatch) => {
        // Input-shaped entries ARE structurally the fragments every consumer
        // reads — the mappers always fill `joinPath`, only the input TYPE
        // leaves it optional — which is exactly what this cast states.
        patchSceneLayer(layerId, patch as unknown as Parameters<typeof patchSceneLayer>[1]);
        setDirty(true);
      },
      [layerId, patchSceneLayer],
    );

    /**
     * The one server write. Sends the WHOLE stored slice — entries are
     * whole-array replacements on the input anyway — through the entry→input
     * mappers, because an entry re-sent without its `joinPath` flattens to
     * `[]`: the same column name, resolved against the wrong table. The
     * server's answer is folded back in (it fills labels and may normalise
     * joins), and dirty clears only on success — a failed save keeps the
     * button, not silently drops the edits.
     */
    const save = useCallback(() => {
      const current = stateRef.current;
      updateMeshLayer({
        variables: {
          input: {
            id: layerId,
            colorBys: current.colorBys.map(colorByEntryToInput),
            filterBys: current.filterBys.map(filterByEntryToInput),
            activeColorBy: current.activeColorBy,
            activeFilterBys: [...current.activeFilterBys],
          },
        },
      })
        .then(({ data }) => {
          const saved = data?.updateMeshLayer;
          if (saved) {
            patchSceneLayer(layerId, {
              colorBys: saved.colorBys,
              filterBys: saved.filterBys,
              activeColorBy: saved.activeColorBy,
              activeFilterBys: saved.activeFilterBys,
            });
          }
          setDirty(false);
        })
        .catch((error) => {
          console.warn("[mesh] could not save the layer:", error);
        });
    }, [layerId, patchSceneLayer, updateMeshLayer]);

    /** Memoized because it crosses the sections' memo boundary as an object. */
    const source: ColumnOptionSource | null = useMemo(
      () =>
        collection ? { kind: "mesh" as const, meshCollection: collection.id } : null,
      [collection],
    );

    /**
     * What the default instance-id colouring can look like: the categorical
     * instance palettes — the SAME set a categorical column entry offers, so
     * "categorical" always means these — plus the uniform material colour.
     */
    const paletteChoices: ColormapChoice[] = useMemo(
      () => [
        ...INSTANCE_COLORMAPS.map((name) => ({
          value: name,
          label: name,
          css: instancePaletteCSS(name),
        })),
        { value: "uniform", label: "uniform", css: uniformCSS },
      ],
      [uniformCSS],
    );

    /** The default row the color section leads with — memoized: it carries a
     * rendered settings element across the section's memo boundary. */
    const defaultRow: DefaultColorRow = useMemo(
      () => ({
        title: "Color by instance id — click to pick a palette (stored)",
        label: byInstance ? "instance id" : "uniform",
        detail: byInstance
          ? `a hue per object — "${activePalette}" palette`
          : "one color for the whole collection",
        swatchCSS: byInstance ? instancePaletteCSS(activePalette) : uniformCSS,
        settings: (
          <div className="space-y-1.5">
            <div className="text-[9px] uppercase tracking-[0.08em] text-white/35">
              palette
            </div>
            <ColormapSelect
              value={byInstance ? activePalette : "uniform"}
              choices={paletteChoices}
              onChange={(value) =>
                value === "uniform"
                  ? patchSceneLayer(layerId, { colorByInstance: false })
                  : patchSceneLayer(layerId, {
                      colorByInstance: true,
                      instanceColormap: value as FabriksInstanceColormap,
                    })
              }
              title="How each object's hue is chosen (session)"
            />
          </div>
        ),
      }),
      [byInstance, activePalette, uniformCSS, paletteChoices, layerId, patchSceneLayer],
    );

    const setOpacity = useCallback(
      (opacity: number) => patchSceneLayer(layerId, { opacity }),
      [layerId, patchSceneLayer],
    );

    return (
      <LayerCardShell
        icon={<Box className="h-3 w-3 text-sky-300" />}
        tile="bg-sky-400/15"
        title={collection ? `Mesh ${collection.id}` : "Mesh (no collection)"}
        hidden={hidden}
        expanded={expanded}
        onToggle={() => onSelect(layerId, expanded)}
        actions={
          <>
            {/* The one server write — same affordance as the image layer card's
                graph save: visible only while there is something to save. */}
            {dirty && (
              <button
                className="shrink-0 rounded p-0.5 text-yellow-300/90 transition-colors hover:text-yellow-200 disabled:opacity-50"
                title="Save changes"
                disabled={saving}
                onClick={save}
              >
                <Save className="h-3 w-3" />
              </button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className={`h-5 w-5 shrink-0 ${
                layer.wireframe ? "bg-sky-400/15 text-sky-300" : "text-white/45 hover:text-white/90"
              }`}
              title={layer.wireframe ? "Solid surface (session)" : "Wireframe (session)"}
              onClick={() => patchSceneLayer(layerId, { wireframe: !layer.wireframe })}
            >
              <Grid3x3 className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 shrink-0 text-white/45 hover:text-white/90"
              title={hidden ? "Show (session)" : "Hide (session)"}
              onClick={() => patchSceneLayer(layerId, { visible: hidden })}
            >
              {hidden ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            </Button>
            {onRemove && (
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 shrink-0 text-white/35 hover:text-red-300"
                title="Remove layer from scene"
                onClick={() => onRemove(layerId)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </>
        }
      >
        {/* Sections hidden without a collection — options are per collection. */}
        {source && (
          <ColorBySection
            source={source}
            colorBys={colorBys}
            activeColorBy={activeColorBy}
            persistEntries={persistEntries}
            persistPick={persistPick}
            defaultRow={defaultRow}
          />
        )}
        {source && (
          <FilterBySection
            source={source}
            filterBys={filterBys}
            activeFilterBys={activeFilterBys}
            persistEntries={persistEntries}
            persistPick={persistPick}
          />
        )}

        <OpacityRow opacity={layer.opacity ?? 1} step={5} onChange={setOpacity} />

        <MeshRenderSection
          layerId={layerId}
          detail={layer.detail}
          flatNormals={effectiveFlatNormals(layer)}
          doubleSided={layer.doubleSided}
          slabScale={layer.slabScale}
        />

        <MeshInstanceSection layerId={layerId} />

        {collection?.store && <MeshStatsFooter store={collection.store} />}
      </LayerCardShell>
    );
  },
);
MeshLayerCard.displayName = "MeshLayerCard";
