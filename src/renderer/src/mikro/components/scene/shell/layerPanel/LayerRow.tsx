import { Button } from "@/components/ui/button";
import { MikroLens } from "@/linkers";
import { Crosshair, Eye, EyeOff, Focus, Save, Trash2 } from "lucide-react";
import { LayerState, useSceneStore } from "../../platform/stores/sceneStore";
import { useViewerStore } from "../../platform/stores/viewerStore";
import { effectiveProbeLayerId } from "../../platform/probe/probeTargeting";
import {
  FLAVOR_BADGE_CLASSES,
  layerDisplayLabel,
  layerFlavor,
} from "../../platform/layerui/layerIdentity";
import { layerSwatchBackground } from "../../platform/layerui/renderGraphSwatch";

/**
 * A single compact layer row for the right-hand Layers panel. Displays a
 * colormap swatch, the layer name and quick toggles (probe target, visibility,
 * focus). Clicking the row selects the layer, which unfolds the render graph
 * inside the same card. All detailed editing lives there, never here.
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
  const flavor = layerFlavor(layer);
  const hidden = layer.visible === false;
  // The highlight follows the EFFECTIVE target — the first visible layer by
  // default — so default probing never looks untargeted; the click keys on the
  // explicit pin, so clicking the default target pins it (survives reorders)
  // rather than writing a no-op null. Subscribing to `probeLayerId` re-renders
  // every row on a pin change; rows are cheap and pinning is click cadence.
  const probeLayerId = useViewerStore((s) => s.probeLayerId);
  const isExplicitPin = probeLayerId === layer.id;
  const isProbeTarget = useSceneStore(
    (s) => effectiveProbeLayerId(probeLayerId, s.layers) === layer.id,
  );
  const setProbeLayerId = useViewerStore((s) => s.setProbeLayerId);
  // One size vocabulary per variant, so the row cannot end up half-compact.
  const buttonSize = compact
    ? "h-5 w-5 p-0"
    : "h-6 w-6 p-0 @md/card:h-7 @md/card:w-7";
  const iconMuted = compact ? "text-white/45 hover:text-white/90" : "text-white/70 hover:text-white";

  const row = (
    <div
      className={`group flex items-center gap-1.5 px-2 py-1.5 cursor-pointer @xs/card:gap-2 @xs/card:px-2.5 ${
        embedded
          ? "transition-colors"
          : `rounded-lg border backdrop-blur-md transition-colors ${
              isSelected
                ? "border-white/40 bg-white/10"
                : "border-white/10 bg-black/40 hover:border-white/20 hover:bg-white/5"
            }`
      } ${hidden ? "opacity-50" : ""}`}
      onClick={onSelect}
    >
      {/* The leading mark. Compact reads it as the other cards' icon TILE —
          same geometry as their kind icon — except the tile is the layer's
          own colormap, which says more than a generic glyph would. */}
      <span
        className={
          compact
            ? "h-5 w-5 shrink-0 rounded ring-1 ring-white/10"
            : "h-3 w-3 shrink-0 rounded-full ring-1 ring-black/30"
        }
        style={{ background: layerSwatchBackground(layer.channels) }}
      />
      <span
        className={`min-w-0 flex-1 truncate font-medium text-white/90 ${
          compact ? "text-[11px]" : "text-xs"
        }`}
      >
        {label}
      </span>
      {/* Secondary to the name: the flavor badge only competes for width once
          the card is wide enough to seat both without truncating. */}
      <span
        className={`hidden shrink-0 rounded-full border px-1.5 text-[9px] leading-4 @3xs/card:inline-block ${FLAVOR_BADGE_CLASSES[flavor]}`}
        title="What kind of data this layer paints"
      >
        {flavor}
      </span>
      {graphDirty && onSaveGraph && (
        <button
          className="shrink-0 rounded p-0.5 text-yellow-300/90 transition-colors hover:text-yellow-200 disabled:opacity-50"
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
        {/* Pin the probe to this layer. Exactly one layer answers the probe —
            the first visible one by default — so with stacked layers this is
            how you read one further down. */}
        <Button
          variant="ghost"
          size="xs"
          className={
            isProbeTarget
              ? `${buttonSize} text-sky-300 hover:text-sky-200`
              : `${buttonSize} ${iconMuted}`
          }
          // A hidden layer draws no mesh, so it can answer no probe — pinning
          // it is merely pointless now (the target derivation falls back to
          // the first visible layer), but offering the button would still lie.
          disabled={hidden}
          title={
            hidden
              ? "A hidden layer cannot be probed"
              : isExplicitPin
                ? "Only this layer answers the probe — click to return to the default (first layer)"
                : isProbeTarget
                  ? "Answers the probe by default — click to pin it explicitly"
                  : "Probe this layer instead of the default"
          }
          onClick={(e) => {
            e.stopPropagation();
            // Pin ONLY: choosing which layer answers the probe must not yank
            // the whole scene into PROBE mode — the user may be mid-navigation
            // or mid-annotation and just setting up the target for later.
            setProbeLayerId(isExplicitPin ? null : layer.id);
          }}
        >
          <Crosshair className="h-3 w-3" />
        </Button>
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
            <EyeOff className="h-3 w-3 text-white/50" />
          ) : (
            <Eye className="h-3 w-3" />
          )}
        </Button>
        {onRemove && (
          <Button
            variant="ghost"
            size="xs"
            className={`${buttonSize} ${
              compact ? "text-white/35" : "text-white/70"
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
  return <MikroLens.Drop object={{ id: layer.lens.id }}>{row}</MikroLens.Drop>;
};
