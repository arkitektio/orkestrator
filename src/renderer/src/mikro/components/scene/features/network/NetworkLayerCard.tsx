import { Slider } from "@/core/ui/slider";
import { Circle, MoveRight, Share2 } from "lucide-react";
import { memo, useCallback, useMemo, useRef } from "react";
import {
  useUpdateNetworkLayerMutation,
  type SceneLayerFragment,
  type UpdateNetworkLayerInput,
} from "@/mikro/api/graphql";
import {
  DEFAULT_INSTANCE_COLORMAP,
  INSTANCE_COLORMAPS,
  type FabriksInstanceColormap,
} from "../../platform/gpu/instanceColormaps";
import {
  useSceneStore,
  type NetworkLayerSessionState,
} from "../../platform/stores/sceneStore";
import { instancePaletteCSS } from "../../platform/layerui/colormap-utils";
import { ColormapSelect, type ColormapChoice } from "@/core/data/scene/layerui/ColormapSelect";
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
import type { ColumnOptionSource } from "../../platform/layerui/ColumnOptionPicker";
import {
  ColorBySection,
  FilterBySection,
  type DefaultColorRow,
  type EntriesPatch,
  type PickPatch,
} from "../../platform/layerui/entrySections";
import { useOptimisticLayerPatch } from "../../platform/layerui/useOptimisticLayerPatch";
import { LayerCardActions } from "../../platform/layerui/LayerCardActions";

/**
 * A compact card for a `NetworkLayer` in the Layers panel.
 *
 * ## Three kinds of control, as on the track and mesh cards
 *
 *  - **STORED** (`updateNetworkLayer`): line width, `showNodes`, `directed`,
 *    `maxLevel`, opacity, visibility.
 *  - **SESSION** (`patchSceneLayer` only): the detail preset and the 2D slab
 *    scale. Neither has a field on the mutation, and neither should: how
 *    aggressively you are willing to coarsen, and how thick a cross-section you
 *    read, are properties of how you are looking rather than of the graph.
 *  - **FACTS** (`Badge`): what the store's mirrored manifest already says —
 *    the spec version, the level count, and whether the collection was pruned
 *    or straightened at all. `pruning: NONE` on a single-level collection is a
 *    real, checkable statement about the data (nothing was dropped, every node
 *    is where the tracer put it), so it is worth showing rather than hiding.
 *
 * The write cadence is the track card's: edits fold into the store immediately
 * so the canvas previews them, and the mutation fires on COMMIT (slider
 * release) rather than per tick.
 *
 * ## The pickers
 *
 * `colorBys`/`filterBys` land as the shared `ColorBySection`/`FilterBySection`
 * over the network options root, with the GRAPH arm this layer kind alone has:
 * per-node values the collection itself carries. Their write cadence is this
 * card's own — fold locally, mutate on the spot — not the mesh card's
 * dirty/save pair.
 *
 * ## `nodeSizeColumn` / `edgeWidthColumn` are shown, not offered
 *
 * They name PARQUET ATTRIBUTE COLUMNS; the renderer uses `lineWidth` plus the
 * format's own `radii` blob instead. A layer that has one set says so here
 * rather than appearing to honour it.
 */

type NetworkLayerVariant = Extract<SceneLayerFragment, { __typename: "NetworkLayer" }>;
type NetworkLayerView = NetworkLayerVariant & NetworkLayerSessionState;

/**
 * What `persist` may be handed: the mutation's OWN field set, minus the id.
 *
 * Not `Partial<NetworkLayerVariant>` — that admits `__typename`, `collection`,
 * `asAffine` and `pathToWorld`, none of which the input has, and GraphQL
 * rejects the WHOLE mutation on one unknown input field.
 */
type NetworkPatch = Omit<UpdateNetworkLayerInput, "id">;

const DETAIL_LABELS = {
  fine: "fine",
  balanced: "balanced",
  fast: "fast",
} as const;

/** Read the mirrored manifest without asserting a shape on an `any` scalar. */
const readEncoding = (encoding: unknown): Record<string, unknown> =>
  typeof encoding === "object" && encoding !== null ? (encoding as Record<string, unknown>) : {};

export const NetworkLayerCard = memo(
  ({
    layer,
    expanded,
    onSelect,
    onRemove,
  }: {
    layer: NetworkLayerView;
    /** Whether the card's controls are unfolded (`LayerCardShell`). */
    expanded: boolean;
    /** The panel's toggle — handed the current state, see `cardShell.tsx`. */
    onSelect: (id: string, currentlyExpanded: boolean) => void;
    onRemove?: (id: string) => void;
  }) => {
    const patchSceneLayer = useSceneStore((s) => s.patchSceneLayer);
    const [updateNetworkLayer] = useUpdateNetworkLayerMutation();

    const hidden = layer.visible === false;
    const collection = layer.collection;
    const store = collection?.store;
    const encoding = readEncoding(store?.encoding ?? collection?.encoding);
    const grid = readEncoding(store?.grid ?? collection?.grid);
    const levels = typeof grid.levels === "number" ? grid.levels : null;
    const counts = readEncoding(store?.counts);

    /**
     * Preview locally, persist on commit. The fold is not optional: the scene
     * provider reconciles layers by STRUCTURE, so a `GetScene` re-emission that
     * changed only this layer's content keeps the stored object as it was.
     */
    const persist = useOptimisticLayerPatch<NetworkPatch>(
      layer.id,
      updateNetworkLayer,
      "[konnektion]",
    );

    const lineWidth = layer.lineWidth ?? 1;
    const showNodes = layer.showNodesOverride ?? layer.showNodes;
    const directed = layer.directedOverride ?? layer.directed;
    const detail = layer.detail ?? "balanced";
    const slabScale = layer.slabScale ?? 1;
    const hasRadii = typeof encoding.radii === "string" && encoding.radii !== "NONE";

    // ---- the pickers -----------------------------------------------------
    // Same drop-in sections the mesh card uses, over the network options root.
    // The write cadence here is the card's own (fold locally, mutate at once)
    // rather than the mesh card's dirty/save pair — this card has no Save
    // button, and its every other control already persists per commit.
    const colorBys = layer.colorBys ?? [];
    const filterBys = layer.filterBys ?? [];
    const activeColorBy = layer.activeColorBy ?? null;
    const activeFilterBys = useMemo(
      () => layer.activeFilterBys ?? [],
      [layer.activeFilterBys],
    );

    const source = useMemo<ColumnOptionSource | null>(
      () => (collection ? { kind: "network", networkCollection: collection.id } : null),
      [collection],
    );

    // Ref-backed so the section handlers stay identity-stable — the sections'
    // memo depends on it (the mesh card's contract, kept here).
    const pickerRef = useRef({ persist });
    pickerRef.current = { persist };

    const persistEntries = useCallback((patch: EntriesPatch) => {
      pickerRef.current.persist(patch as NetworkPatch);
    }, []);
    const persistPick = useCallback((patch: PickPatch) => {
      pickerRef.current.persist(patch as NetworkPatch);
    }, []);

    // The mesh card's default row, verbatim semantics: instance-id colouring
    // is the DEFAULT, the uniform material colour the opt-out — session-local
    // on both layer kinds, so patchSceneLayer alone, never `persist`.
    const byInstance = layer.colorByInstance !== false;
    const activePalette = layer.instanceColormap ?? DEFAULT_INSTANCE_COLORMAP;
    const uniformCSS = Array.isArray(layer.materialColor)
      ? `rgb(${layer.materialColor.slice(0, 3).join(",")})`
      : "rgb(217, 219, 230)";

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

    const defaultRow = useMemo<DefaultColorRow>(
      () => ({
        title: "Color by instance id — click to pick a palette (session)",
        label: byInstance ? "instance id" : "uniform",
        detail: byInstance
          ? `a hue per object — "${activePalette}" palette`
          : "one colour for the whole network",
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
                  ? patchSceneLayer(layer.id, { colorByInstance: false })
                  : patchSceneLayer(layer.id, {
                      colorByInstance: true,
                      instanceColormap: value as FabriksInstanceColormap,
                    })
              }
              title="How each object's hue is chosen (session)"
            />
          </div>
        ),
      }),
      [byInstance, activePalette, uniformCSS, paletteChoices, layer.id, patchSceneLayer],
    );

    return (
      <LayerCardShell
        icon={<Share2 className="h-3 w-3 text-emerald-300" />}
        tile="bg-emerald-400/15"
        title={layer.name?.trim() || `Network ${collection?.version ?? layer.id}`}
        hidden={hidden}
        expanded={expanded}
        onToggle={() => onSelect(layer.id, expanded)}
        actions={
          <LayerCardActions
            hidden={hidden}
            onToggleVisible={() => persist({ visible: hidden })}
            onRemove={onRemove ? () => onRemove(layer.id) : undefined}
          />
        }
      >
        {/* ------------------------------------------------ width ---------- */}
        <CardSection title="line width">
          <div className="flex items-center gap-1.5">
            <Slider
              min={0.1}
              max={20}
              step={0.1}
              value={[lineWidth]}
              onValueChange={([value]) => patchSceneLayer(layer.id, { lineWidth: value })}
              onValueCommit={([value]) => persist({ lineWidth: value })}
              className="flex-1 py-1"
              // The honest caveat, in the tooltip rather than as a disabled
              // control: the number is still the fallback where the collection
              // carries no radii, so the slider is useful either way.
              title={
                hasRadii
                  ? "The flat width, in scene units. This collection carries per-node radii, which override it — segments taper between their endpoints."
                  : "The width of every segment, in scene units. A well-defined length only where the layer's placement is a similarity or better."
              }
            />
            <span className="w-8 shrink-0 text-right font-mono text-[9px] text-white/40">
              {lineWidth}
            </span>
          </div>
          {hasRadii && (
            <div className="mt-1 text-[9px] text-white/35">
              per-node radii from the collection override this
            </div>
          )}
        </CardSection>

        {/* ------------------------------------------------ pickers -------- */}
        {/* The GRAPH entries are this layer kind's own: a per-node value the
            collection itself carries (strahler, degree, depth, component, a
            writer's column, radius), beside the mesh-style table columns its
            object ids reach. */}
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

        {/* ------------------------------------------------ glyphs --------- */}
        <CardSection title="draw">
          <div className="flex flex-wrap items-center gap-1.5">
            <IconToggle
              icon={<Circle className="h-3 w-3" />}
              label="nodes"
              active={showNodes}
              title="Draw a glyph at each node as well as the segments between them"
              // Session override for the instant preview, stored on commit —
              // one click, one mutation, no lag between them.
              onClick={() => {
                patchSceneLayer(layer.id, { showNodesOverride: !showNodes });
                persist({ showNodes: !showNodes });
              }}
            />
            <IconToggle
              icon={<MoveRight className="h-3 w-3" />}
              label="direction"
              active={directed}
              title="Draw each edge's direction as an arrowhead. A render setting, never a fact about the graph: an edge is always stored source-to-target."
              onClick={() => {
                patchSceneLayer(layer.id, { directedOverride: !directed });
                persist({ directed: !directed });
              }}
            />
          </div>
        </CardSection>

        {/* ------------------------------------------------ detail --------- */}
        <CardSection title="detail">
          <div className="flex flex-wrap items-center gap-1.5">
            <SegmentGroup>
              {(["fine", "balanced", "fast"] as const).map((preset) => (
                <Segment
                  key={preset}
                  active={detail === preset}
                  title={`Screen-space error budget: ${DETAIL_LABELS[preset]}. Session-local — how hard you are willing to coarsen is a property of how you are looking.`}
                  onClick={() => patchSceneLayer(layer.id, { detail: preset })}
                >
                  {DETAIL_LABELS[preset]}
                </Segment>
              ))}
            </SegmentGroup>
            {levels !== null && levels <= 1 && (
              <Badge title="This collection has a single level — konnektion picks its depth from the data, and a traced arbor rarely earns a ladder. There is nothing to coarsen to, so the preset has no effect here.">
                single level
              </Badge>
            )}
          </div>
        </CardSection>

        {/* ------------------------------------------------ slab ----------- */}
        <CardSection title="2d slab">
          <SegmentGroup>
            {[1, 3, 5].map((scale) => (
              <Segment
                key={scale}
                active={slabScale === scale}
                title={`Draw the part of the network within ${scale}× the scene's z-step of the displayed slice`}
                onClick={() => patchSceneLayer(layer.id, { slabScale: scale })}
              >
                ×{scale}
              </Segment>
            ))}
          </SegmentGroup>
        </CardSection>

        {/* ------------------------------------------------ opacity -------- */}
        <OpacityRow
          opacity={layer.opacity ?? 1}
          onChange={(opacity) => patchSceneLayer(layer.id, { opacity })}
          onCommit={(opacity) => persist({ opacity })}
        />

        {/* ------------------------------------------------ facts ---------- */}
        <CardSection title="collection">
          <div className="flex flex-wrap items-center gap-1">
            {collection?.specVersion && <Badge title="konnektion spec version">spec {collection.specVersion}</Badge>}
            {levels !== null && (
              <Badge title="Octree levels the manifest declares; 0 is the finest">
                {levels} level{levels === 1 ? "" : "s"}
              </Badge>
            )}
            {typeof counts.nodes === "number" && (
              <Badge title="Nodes across the whole collection. Ghosts are not counted — they are copies of an endpoint another cell owns.">
                {formatCount(counts.nodes)} nodes
              </Badge>
            )}
            {typeof counts.edges === "number" && (
              <Badge title="Edges across the whole collection">
                {formatCount(counts.edges)} edges
              </Badge>
            )}
            {typeof encoding.pruning === "string" && (
              <Badge
                title={
                  encoding.pruning === "NONE"
                    ? "Nothing was pruned: every branch the tracer drew is present at every level."
                    : "Strahler pruning: coarse levels drop whole twigs rather than approximating them, so a coarse level has genuinely fewer branches."
                }
              >
                pruning {String(encoding.pruning).toLowerCase()}
              </Badge>
            )}
            {typeof encoding.simplification === "string" && (
              <Badge
                title={
                  encoding.simplification === "NONE"
                    ? "Nothing was straightened: every node sits exactly where the tracer put it."
                    : "Douglas–Peucker: long runs were straightened, bounded by the level's lod_error. No node ever moved — survivors are re-linked."
                }
              >
                {String(encoding.simplification).toLowerCase().replace(/_/g, "–")}
              </Badge>
            )}
          </div>

          {/* Declared-but-unimplemented: shown so a set field is not silently
              ignored. See the module docblock. */}
          {(layer.nodeSizeColumn || layer.edgeWidthColumn) && (
            <div className="mt-1 text-[9px] text-amber-300/60">
              {layer.nodeSizeColumn
                ? `nodeSizeColumn "${layer.nodeSizeColumn}"`
                : `edgeWidthColumn "${layer.edgeWidthColumn}"`}{" "}
              is set but not yet applied — the renderer widths come from
              lineWidth and the collection&apos;s own radii.
            </div>
          )}
        </CardSection>
      </LayerCardShell>
    );
  },
);

NetworkLayerCard.displayName = "NetworkLayerCard";
