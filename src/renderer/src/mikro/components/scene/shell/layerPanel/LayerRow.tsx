import { Button } from "@/core/ui/button";
import { lensSmart } from "@/core/linkers";
import { Eye, EyeOff, Focus, Save, Trash2 } from "lucide-react";
import { LayerState } from "../../platform/stores/sceneStore";
import { layerDisplayLabel } from "../../platform/layerui/layerIdentity";
import { LayerGlyph } from "../../platform/layerui/LayerGlyph";
import { LayerTile } from "@/core/data/scene/layerui/cardControls";
import { LensButton } from "../../platform/layerui/LensButton";

/**
 * A single compact layer row for the right-hand Layers panel. Displays a
 * colormap swatch, the layer name and quick toggles (visibility, focus).
 * Clicking the row selects the layer, which unfolds the render graph inside
 * the same card. All detailed editing lives there, never here. Which layers
 * the probe and tasks use is picked in the control bar (`LayerTargetPicker`).
 *
 * The row is width-adaptive against its CARD (`@container/card`, set by
 * `LayerControlPanel`), not the window: the name always survives, and the
 * secondary badges join back in as the container earns the room for them. A
 * narrow in-viewport column and a dragged-open sidebar rail therefore get
 * genuinely different rows out of one component.
 */
export const LayerRow = ({
  layer,
  isSelected,
  onSelect,
  onUpdate,
  onFocus,
  onRemove,
  embedded = false,
  compact = false,
  graphDirty = false,
  savingGraph = false,
  onSaveGraph,
}: {
  layer: LayerState;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (updated: LayerState) => void;
  onFocus: (layerId: string) => void;
  /** Remove the layer from its scene. */
  onRemove?: () => void;
  /**
   * When true the row is the header of an already-styled card (the expandable
   * layer card), so it drops its own border / background / rounding and just
   * renders the flex header inline.
   */
  embedded?: boolean;
  /**
   * Wear the COMPACT card dialect: the same 5x5 leading tile, 11px name and
   * h-5 icon buttons the collection-backed cards (annotation, label, mesh)
   * are built from. Opt-in rather than the default because the image card's
   * row is the one that has to survive a narrow in-viewport column, where the
   * roomier hit areas are what make it usable.
   */
  compact?: boolean;
  /** The render graph has unsaved edits — surfaces a tiny Save button. */
  graphDirty?: boolean;
  /** Save mutation in flight (disables the button). */
  savingGraph?: boolean;
  /** Persist the unsaved render-graph edits. */
  onSaveGraph?: () => void;
}) => {
  const label = layerDisplayLabel(layer);
  const hidden = layer.visible === false;
  // One size vocabulary per variant, so the row cannot end up half-compact.
  const buttonSize = compact
    ? "h-5 w-5 p-0"
    : "h-6 w-6 p-0 @md/card:h-7 @md/card:w-7";
  const iconMuted = compact ? "text-foreground/45 hover:text-foreground/90" : "text-foreground/70 hover:text-foreground";

  const row = (
    <div
      className={`group flex items-center gap-1.5 px-2 py-1.5 cursor-pointer @xs/card:gap-2 @xs/card:px-2.5 ${
        embedded
          ? "transition-colors"
          : `rounded-lg border backdrop-blur-md transition-colors ${
              isSelected
                ? "border-foreground/40 bg-foreground/10"
                : "border-foreground/10 bg-background/40 hover:border-foreground/20 hover:bg-foreground/5"
            }`
      } ${hidden ? "opacity-50" : ""}`}
      onClick={onSelect}
    >
      {/* The leading mark: what the layer paints, drawn (three disks for
          RGB, one in the channel's colour or colormap for an image), in the
          same squircle tile every other card leads with. */}
      <LayerTile tint="bg-foreground/10">
        <LayerGlyph layer={layer} className="h-3.5 w-3.5" />
      </LayerTile>
      <span
        className={`min-w-0 flex-1 truncate font-medium text-foreground/90 ${
          compact ? "text-[11px]" : "text-xs"
        }`}
      >
        {label}
      </span>
      {graphDirty && onSaveGraph && (
        <button
          className="shrink-0 rounded p-0.5 text-yellow-700/90 dark:text-yellow-300/90 transition-colors hover:text-yellow-700 dark:hover:text-yellow-200 disabled:opacity-50"
          title="Save changes"
          disabled={savingGraph}
          onClick={(e) => {
            e.stopPropagation();
            onSaveGraph();
          }}
        >
          <Save className="h-3 w-3" />
        </button>
      )}
      {/* Always reachable at every width — a row you cannot hide or focus from
          is worse than a cramped one. Only the hit area grows with the card. */}
      <div className="flex shrink-0 items-center opacity-60 transition-opacity group-hover:opacity-100 @md/card:opacity-100">
        {/* What the layer reads, to act on: the lens' smart menu. */}
        <LensButton lens={layer.lens} className={`${buttonSize} ${iconMuted}`} />
        <Button
          variant="ghost"
          size="xs"
          className={`${buttonSize} ${iconMuted}`}
          title="Fit camera to layer"
          onClick={(e) => {
            e.stopPropagation();
            onFocus(layer.id);
          }}
        >
          <Focus className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="xs"
          className={`${buttonSize} ${iconMuted}`}
          title="Toggle visibility"
          onClick={(e) => {
            e.stopPropagation();
            onUpdate({ ...layer, visible: hidden ? true : false });
          }}
        >
          {hidden ? (
            <EyeOff className="h-3 w-3 text-foreground/50" />
          ) : (
            <Eye className="h-3 w-3" />
          )}
        </Button>
        {onRemove && (
          <Button
            variant="ghost"
            size="xs"
            className={`${buttonSize} ${
              compact ? "text-foreground/35" : "text-foreground/70"
            } hover:text-red-400`}
            title="Remove layer from scene"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );

  /* The row is a DROP TARGET for the layer's LENS — the thing that names "this
     dataset, these channels". Drop an annotation on it and `SmartContext`
     assembles (Lens, Annotation) for the rekuest action that does the cropping,
     so the gesture itself answers "which dataset did you mean".

     `.Drop`, not `.Smart`: `useSmartDropZone` takes no selection-store
     subscription, while `useSmartModel` snapshots it per instance — and this
     panel is the one that already froze once. A drop zone is also all the row
     needs; it is not itself draggable. */
  const LensSmart = lensSmart(layer.lens.__typename);
  return <LensSmart.Drop object={{ id: layer.lens.id }}>{row}</LensSmart.Drop>;
};
