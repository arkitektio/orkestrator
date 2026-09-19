import { Slider } from "@/components/ui/slider";
import { CircleDot } from "lucide-react";
import { memo } from "react";
import {
  ColorMap,
  useUpdatePointLayerMutation,
  type SceneLayerFragment,
  type UpdatePointLayerInput,
} from "@/mikro-next/api/graphql";
import { useSceneStore } from "../../platform/stores/sceneStore";
import {
  Badge,
  CardSection,
  LayerCardShell,
  OpacityRow,
  RowLabel,
  Segment,
  SegmentGroup,
} from "@/lib/scene/layerui/cardControls";
import { ColormapSelect } from "@/lib/scene/layerui/ColormapSelect";
import { CONTINUOUS_COLORMAP_CHOICES } from "../../platform/layerui/colormap-utils";
import { useOptimisticLayerPatch } from "../../platform/layerui/useOptimisticLayerPatch";
import { LayerCardActions } from "../../platform/layerui/LayerCardActions";

/**
 * A compact card for a `PointLayer` in the Layers panel.
 *
 * The point layer shipped with a renderer and no card at all, so until now a
 * point cloud could not be hidden, resized or recoloured once created — every
 * setting was whatever `createPointLayer` was given. Everything here persists:
 * `updatePointLayer` takes the pickers, `sizeColumn`, `pointSize`, `colormap`,
 * `opacity`, `visible` and `order`.
 *
 * WHAT THIS CARD DOES NOT DO, and why it is a gap rather than a decision: it
 * cannot ADD a colouring. `ColumnOptionPicker` — which is how the mesh and label
 * cards let you pick a new column — has exactly two roots on the server,
 * `colorByOptions(meshCollection:)` and `labelColorByOptions(lens:)`. A point
 * layer has neither a collection nor a lens; its objects ARE rows of its table,
 * which is precisely the case the option queries do not cover. So this card
 * switches between the colourings the layer already publishes and tunes the
 * flat settings, and adding one still means recreating the layer. Closing that
 * means a table-rooted options query on the server, mirroring the label one.
 *
 * Write cadence follows the mesh card: edits fold into the store immediately so
 * the canvas previews them, and sliders persist on COMMIT rather than per tick.
 */

type PointLayerVariant = Extract<SceneLayerFragment, { __typename: "PointLayer" }>;

/**
 * What `persist` may be handed: the mutation's OWN field set, minus the id.
 * `Partial<PointLayerVariant>` would admit `__typename`, `tableDataset` and the
 * placement fields, and GraphQL rejects the whole mutation on one unknown input
 * field — see the sibling note in `TrackLayerCard`.
 */
type PointPatch = Omit<UpdatePointLayerInput, "id">;

export const PointLayerCard = memo(
  ({
    layer,
    expanded,
    onSelect,
    onRemove,
  }: {
    layer: PointLayerVariant;
    /** Whether the card's controls are unfolded (`LayerCardShell`). */
    expanded: boolean;
    /** The panel's toggle — handed the current state, see `cardShell.tsx`. */
    onSelect: (id: string, currentlyExpanded: boolean) => void;
    onRemove?: (id: string) => void;
  }) => {
    const patchSceneLayer = useSceneStore((s) => s.patchSceneLayer);
    const [updatePointLayer] = useUpdatePointLayerMutation();
    const hidden = layer.visible === false;

    /**
     * Preview locally, persist on commit.
     *
     * The fold is not optional: `SceneProvider` reconciles the layer set by
     * STRUCTURE, so a `GetScene` re-emission that changed only this layer's
     * content keeps the stored object as it was.
     *
     * `colorBys`/`filterBys` are deliberately never sent from here. They are
     * whole-array replacements on the input, and an entry read back without its
     * `joinPath` or its clims and re-sent flattens them — the same column name
     * resolved against the wrong table, silently. This card only ever moves the
     * ACTIVE index, which carries no such hazard.
     */
    const persist = useOptimisticLayerPatch<PointPatch>(layer.id, updatePointLayer, "[points]");


    const colorBys = layer.colorBys ?? [];
    const pointSize = layer.pointSize ?? 3;

    /** A colouring's own label, else the column or matrix it names. */
    const captionOf = (entry: (typeof colorBys)[number], index: number): string =>
      entry.label?.trim() || entry.column?.trim() || `colouring ${index + 1}`;

    return (
      <LayerCardShell
        icon={<CircleDot className="h-3 w-3 text-violet-300" />}
        tile="bg-violet-400/15"
        title={layer.tableDataset?.name?.trim() || `Points ${layer.id}`}
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
        {/* ------------------------------------------------ size ----------- */}
        <CardSection title="size">
          <div className="flex items-center gap-1.5">
            <Slider
              min={0.5}
              max={20}
              step={0.5}
              value={[pointSize]}
              onValueChange={([value]) => patchSceneLayer(layer.id, { pointSize: value })}
              onValueCommit={([value]) => persist({ pointSize: value })}
              className="flex-1 py-1"
            />
            <span className="w-7 shrink-0 text-right font-mono text-[9px] text-white/40">
              {pointSize}
            </span>
          </div>
        </CardSection>

        {/* ------------------------------------------------ colouring ------ */}
        {colorBys.length > 0 && (
          <CardSection title="color by">
            <SegmentGroup>
              <Segment
                active={layer.activeColorBy == null}
                title="Draw every point in the flat colour, ignoring the colourings below"
                onClick={() => persist({ activeColorBy: null })}
              >
                flat
              </Segment>
              {colorBys.map((entry, index) => (
                <Segment
                  key={`${entry.table ?? entry.dataset ?? "entry"}-${entry.column ?? index}`}
                  active={layer.activeColorBy === index}
                  title={`Colour the points by ${captionOf(entry, index)}`}
                  onClick={() => persist({ activeColorBy: index })}
                >
                  {captionOf(entry, index)}
                </Segment>
              ))}
            </SegmentGroup>
            {layer.activeColorBy != null && (
              <div className="mt-1.5">
                <ColormapSelect
                  value={layer.colormap ?? ColorMap.Viridis}
                  choices={CONTINUOUS_COLORMAP_CHOICES}
                  onChange={(value) => persist({ colormap: value as ColorMap })}
                  title="The ramp used when the active colouring names none of its own"
                />
              </div>
            )}
          </CardSection>
        )}

        <OpacityRow
          opacity={layer.opacity ?? 1}
          onChange={(opacity) => patchSceneLayer(layer.id, { opacity })}
          onCommit={(opacity) => persist({ opacity })}
        />

        {/* What the layer IS. The coordinate and id columns come from the
            dataset's declared roles, so they are stated rather than offered. */}
        <div className="flex flex-wrap items-center gap-1 border-t border-white/5 px-2 py-1">
          <RowLabel>from</RowLabel>
          <Badge title="The coordinate columns, resolved from the dataset's declared axes">
            {[layer.xColumn, layer.yColumn, layer.zColumn].filter(Boolean).join(" · ")}
          </Badge>
          {layer.tColumn ? (
            <Badge title="The time column the scene's T slider scrubs over — one timepoint is drawn at a time">
              t {layer.tColumn}
            </Badge>
          ) : (
            <Badge title="This table declares no time column, so every point is always drawn">
              untimed
            </Badge>
          )}
          {layer.sizeColumn && (
            <Badge title="The measure column mapped to per-point size">
              size {layer.sizeColumn}
            </Badge>
          )}
          {(layer.activeFilterBys?.length ?? 0) > 0 && (
            <Badge title="Active rules combine with AND; a point is drawn when every one keeps it. Rules over this table's own columns and sparse slices apply; others are skipped and logged.">
              {layer.activeFilterBys?.length} filter(s)
            </Badge>
          )}
        </div>
      </LayerCardShell>
    );
  },
);
PointLayerCard.displayName = "PointLayerCard";
