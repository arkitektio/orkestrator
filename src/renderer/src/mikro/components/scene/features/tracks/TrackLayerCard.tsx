import { Slider } from "@/core/ui/slider";
import { Spline } from "lucide-react";
import { memo, useMemo } from "react";
import {
  ColorMap,
  useUpdateTrackLayerMutation,
  type SceneLayerFragment,
  type UpdateTrackLayerInput,
} from "@/mikro/api/graphql";
import { publishedMaxIndex, TIME_DIM } from "../../platform/model/dimExtents";
import { useSceneStore } from "../../platform/stores/sceneStore";
import {
  Badge,
  CardSection,
  LayerCardShell,
  OpacityRow,
  RowLabel,
  formatCount,
} from "@/core/data/scene/layerui/cardControls";
import { ColormapSelect } from "@/core/data/scene/layerui/ColormapSelect";
import { CONTINUOUS_COLORMAP_CHOICES } from "../../platform/layerui/colormap-utils";
import { DEFAULT_TAIL_WINDOW } from "./TracksLayer";
import { useOptimisticLayerPatch } from "../../platform/layerui/useOptimisticLayerPatch";
import { LayerCardActions } from "../../platform/layerui/LayerCardActions";

/**
 * A compact card for a `TrackLayer` in the Layers panel.
 *
 * THREE KINDS OF CONTROL live here, and the difference is the whole reason this
 * file reads the way it does:
 *
 *  - **STORED** (`updateTrackLayer`): line width, colouring column, colormap,
 *    opacity, visibility. These now have a home on the server — the mutation
 *    was added alongside this card, since without it every knob here would have
 *    been a setting that silently forgot itself on reload.
 *  - **SESSION** (`sceneStore.trackTailWindows`): the tail length. Deliberately
 *    NOT stored, and not for want of a field: a tail window is a property of how
 *    you are looking at a trajectory, not of the trajectory. Two people reading
 *    one scene should not fight over it.
 *  - **FACTS** (`Badge`): which columns provide the coordinates, the time and
 *    the track identity. Shown, never edited. The dataset declares them by
 *    ROLE, and a per-layer override could disagree with the schema the table
 *    already publishes — which is exactly why `CreateTrackLayerInput` has no
 *    field for them either.
 *
 * The write cadence is the mesh card's: edits fold into the store immediately so
 * the canvas previews them, and the mutation is fired on COMMIT (slider release)
 * rather than per tick, so dragging a width does not post thirty mutations.
 */

type TrackLayerVariant = Extract<SceneLayerFragment, { __typename: "TrackLayer" }>;

/**
 * What `persist` may be handed: the mutation's OWN field set, minus the id.
 *
 * Not `Partial<TrackLayerVariant>`, which is the obvious spelling and the wrong
 * one — it admits `__typename`, `tableDataset`, `asAffine` and `pathToWorld`,
 * none of which the input has, and GraphQL rejects the WHOLE mutation on one
 * unknown input field. The narrower type makes that a compile error instead of
 * a runtime surprise the day someone patches two fields at once.
 */
type TrackPatch = Omit<UpdateTrackLayerInput, "id">;

/** Tail lengths worth offering, in timepoints. 0 means "draw the whole track". */
const TAIL_MAX = 60;

export const TrackLayerCard = memo(
  ({
    layer,
    expanded,
    onSelect,
    onRemove,
  }: {
    layer: TrackLayerVariant;
    /** Whether the card's controls are unfolded (`LayerCardShell`). */
    expanded: boolean;
    /** The panel's toggle — handed the current state, see `cardShell.tsx`. */
    onSelect: (id: string, currentlyExpanded: boolean) => void;
    onRemove?: (id: string) => void;
  }) => {
    const patchSceneLayer = useSceneStore((s) => s.patchSceneLayer);
    const setTailWindow = useSceneStore((s) => s.setTrackTailWindow);
    const tailWindow = useSceneStore(
      (s) => s.trackTailWindows[layer.id] ?? DEFAULT_TAIL_WINDOW,
    );
    // A SCALAR selector: the extents record is rewritten whenever any layer
    // finishes a read, and subscribing to the object — or to this layer's own
    // extent ARRAY, which is rebuilt per publish — would re-render every card
    // for a sibling's load (P17). `publishedMaxIndex` reduces it to a number.
    const timepoints = useSceneStore((s) =>
      publishedMaxIndex(s.layerDimExtents[layer.id], TIME_DIM),
    );

    const [updateTrackLayer] = useUpdateTrackLayerMutation();
    const hidden = layer.visible === false;
    const hasTime = timepoints !== undefined && timepoints > 0;

    /**
     * Preview locally, persist on commit. The fold is not optional: the scene
     * provider reconciles layers by STRUCTURE, so a `GetScene` re-emission that
     * changed only this layer's content keeps the stored object as it was.
     */
    const persist = useOptimisticLayerPatch<TrackPatch>(layer.id, updateTrackLayer, "[tracks]");


    /** Only the measure columns: a coordinate or the track id is not a colouring. */
    const measureColumns = useMemo(
      () =>
        (layer.tableDataset?.columns ?? []).filter(
          (column) => column.role === "ATTRIBUTE" || column.role === "COLOR",
        ),
      [layer.tableDataset],
    );

    const lineWidth = layer.lineWidth ?? 1;

    return (
      <LayerCardShell
        icon={<Spline className="h-3 w-3 text-sky-300" />}
        tile="bg-sky-400/15"
        title={layer.tableDataset?.name?.trim() || `Tracks ${layer.id}`}
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
        {/* ------------------------------------------------ tail ----------- */}
        {hasTime && (
          <CardSection title="tail">
            <div className="flex items-center gap-1.5">
              <Slider
                min={0}
                max={Math.min(TAIL_MAX, timepoints)}
                step={1}
                value={[Math.min(tailWindow, timepoints)]}
                onValueChange={([value]) => setTailWindow(layer.id, value)}
                className="flex-1 py-1"
              />
              <span
                className="w-12 shrink-0 text-right font-mono text-[9px] text-white/40"
                title={
                  tailWindow === 0
                    ? "The whole trajectory is drawn, with no fade"
                    : "How many timepoints of trajectory trail behind the current one, fading out"
                }
              >
                {tailWindow === 0 ? "full" : `${tailWindow} tp`}
              </span>
            </div>
          </CardSection>
        )}

        {/* ------------------------------------------------ width ---------- */}
        <CardSection title="width">
          <div className="flex items-center gap-1.5">
            <Slider
              min={0.5}
              max={10}
              step={0.5}
              value={[lineWidth]}
              // Preview per tick; one mutation on release.
              onValueChange={([value]) => patchSceneLayer(layer.id, { lineWidth: value })}
              onValueCommit={([value]) => persist({ lineWidth: value })}
              className="flex-1 py-1"
            />
            <span className="w-7 shrink-0 text-right font-mono text-[9px] text-white/40">
              {lineWidth}
            </span>
          </div>
        </CardSection>

        {/* ------------------------------------------------ colour --------- */}
        <CardSection title="color by">
          <div className="flex items-center gap-1.5">
            <select
              value={layer.colorByColumn ?? ""}
              onChange={(event) =>
                persist({ colorByColumn: event.target.value || null })
              }
              className="h-6 min-w-0 flex-1 rounded border border-white/10 bg-black/30 px-1.5 text-[10px] text-white/80"
              title="Colour every segment by one of the table's measure columns. Coordinate and track-id columns are not offered — the dataset declares those by role."
            >
              <option value="">flat colour</option>
              {measureColumns.map((column) => (
                <option key={column.name} value={column.name}>
                  {column.name}
                </option>
              ))}
            </select>
            {layer.colorByColumn && (
              <div className="w-24 shrink-0">
                <ColormapSelect
                  value={layer.colormap ?? ColorMap.Viridis}
                  choices={CONTINUOUS_COLORMAP_CHOICES}
                  onChange={(value) => persist({ colormap: value as ColorMap })}
                  title="The ramp the colouring column runs through"
                />
              </div>
            )}
          </div>
        </CardSection>

        <OpacityRow
          opacity={layer.opacity ?? 1}
          onChange={(opacity) => patchSceneLayer(layer.id, { opacity })}
          onCommit={(opacity) => persist({ opacity })}
        />

        {/* What the layer IS. Derived from the dataset's column roles, so these
            are stated rather than offered — see the docblock. */}
        <div className="flex flex-wrap items-center gap-1 border-t border-white/5 px-2 py-1">
          <RowLabel>from</RowLabel>
          {layer.trackIdColumn && (
            <Badge title="The TRACK_ID column that groups rows into trajectories">
              id {layer.trackIdColumn}
            </Badge>
          )}
          <Badge title="The coordinate columns, resolved from the dataset's declared axes">
            {[layer.xColumn, layer.yColumn, layer.zColumn].filter(Boolean).join(" · ")}
          </Badge>
          {layer.tColumn ? (
            <Badge title="The time column the tail scrubs over">t {layer.tColumn}</Badge>
          ) : (
            <Badge title="This table declares no time column, so the whole trajectory is always drawn and there is no tail to fade">
              untimed
            </Badge>
          )}
          {hasTime && (
            <Badge title="Distinct timepoints observed in this table">
              {formatCount(timepoints + 1)} tp
            </Badge>
          )}
        </div>
      </LayerCardShell>
    );
  },
);
TrackLayerCard.displayName = "TrackLayerCard";
