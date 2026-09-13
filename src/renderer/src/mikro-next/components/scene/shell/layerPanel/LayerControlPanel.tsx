import { useDialog } from "@/app/dialog";
import { useDeleteLayerMutation, type SceneLayerFragment } from "@/mikro-next/api/graphql";
import { Fragment, useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { LongCommitProfiler } from "../../platform/perf/commitProfiler";
import { perfMonitor } from "../../platform/perf/perfMonitor";
import { useSelectionStore } from "../../platform/stores/selectionStore";
import { LayerState, useSceneStore } from "../../platform/stores/sceneStore";
import { LAYER_CARDS, renderLayerCard, type AnyLayerCardEntry } from "./cardRegistry";
import { DesignStagingCard } from "../../features/meshDesign/ui/DesignStagingCard";
import { useViewerStore } from "../../platform/stores/viewerStore";
import { useBrickStore } from "../../features/bricks/store/brickSlice";
import { unplaceableReason } from "../../platform/model/layerModel";
import { UnplaceableNotice } from "./UnplaceableNotice";

// Viewport coverage is deliberately GONE from this panel (and from
// LayerViewRange entirely). It used to arrive as a bucketed Record and flow
// into each card as a `viewportPercent` prop — and a changing prop defeats
// `memo(LayerCard)`, so every bucket crossing during a zoom re-rendered the
// card's whole render-graph editor subtree (measured 54–174 ms commits, the
// sidebar's share of gesture jank).

export const LayerControlPanel = ({
  sceneId,
  variant = "floating",
}: {
  sceneId: string;
  /**
   * Where the panel is hosted. "floating" is the in-viewport overlay stack
   * (pointer events opt back in per card, height bounded by the column);
   * "sidebar" fills a page-rail tab, which hands the panel a plain full-height
   * flex box and expects it to own its scroll.
   */
  variant?: "floating" | "sidebar";
}) => {
  perfMonitor.countRender("LayerControlPanel"); // no-op unless a perf recording is armed
  const { openDialog } = useDialog();
  const layers = useSceneStore((s) => s.layers);
  // Mesh layers are NOT in `layers`: that list is the normalized image
  // layers (pyramid + render graph). A mesh layer is consumed straight off
  // the polymorphic fragment, so the panel reads it from there.
  const sceneLayers = useSceneStore((s) => s.sceneLayers);
  const updateLayer = useSceneStore((s) => s.updateLayer);
  const selectedLayerId = useSelectionStore((s) => s.selectedLayerId);
  const setSelectedLayerId = useSelectionStore((s) => s.setSelectedLayerId);
  const fitToLayer = useViewerStore((s) => s.fitToLayer);
  // Rarely changes (only when the viability verdict flips) — P17-clean.
  const unplannableLayers = useBrickStore((s) => s.unplannableLayers);
  // Per-layer explicit open/closed, keyed by id. Absent = follow the
  // selection; present = the user has said otherwise for that card.
  const [expandOverrides, setExpandOverrides] = useState<Record<string, boolean>>({});

  // Deleting refetches GetScene, which reinitializes the scene stores so the
  // removed layer drops out — the same store-free path layer creation uses.
  const [deleteLayer] = useDeleteLayerMutation({
    refetchQueries: ["GetScene"],
    awaitRefetchQueries: true,
  });

  // Stable handlers so the memoized LayerCard actually skips re-render during a
  // pan/orbit. The zustand actions (setSelectedLayerId, updateLayer,
  // fitToLayer) are already stable refs; these wrap
  // them without capturing per-render values (selection is read via a ref).
  const selectedRef = useRef(selectedLayerId);
  selectedRef.current = selectedLayerId;

  // Toggling records an explicit choice for that card and moves the selection
  // with it (the 3D layer reads `selectedLayerId` for its highlight). Stable:
  // the card supplies its own current state, so nothing per-render is captured.
  const handleSelect = useCallback(
    (id: string, currentlyExpanded: boolean) => {
      setExpandOverrides((prev) => ({ ...prev, [id]: !currentlyExpanded }));
      setSelectedLayerId(currentlyExpanded ? null : id);
    },
    [setSelectedLayerId],
  );
  const handleClose = useCallback(
    () => setSelectedLayerId(null),
    [setSelectedLayerId],
  );
  const handleRemove = useCallback(
    (id: string) => {
      // Drop the selection first if it points at the layer being removed, so
      // the panel doesn't try to keep an unfolded editor for a gone layer.
      if (selectedRef.current === id) setSelectedLayerId(null);
      void deleteLayer({ variables: { input: { id } } }).catch((e) =>
        toast.error("Could not remove layer: " + (e as Error).message),
      );
    },
    [deleteLayer, setSelectedLayerId],
  );

  // EVERY layer is listed, in scene order — the order NEVER changes while you
  // work. The list used to hide off-view layers behind a "+N off-view" toggle,
  // and then to sort by viewport coverage; both meant the panel's contents moved
  // as you panned, so the layer you were reaching for slid out from under the
  // cursor. Coverage still shows as a per-row badge, it just no longer decides
  // position.
  //
  // Which card each typename gets, and which of the store's two lists it reads,
  // is `cardRegistry.tsx`'s business — the panel owns ordering and chrome and
  // knows nothing about the cards themselves. It used to spell one
  // pre-partitioned array per typename here, which is what stopped scaling at
  // nine of them.
  //
  // Cards are GROUPED BY RANK rather than interleaved by the scene's `order`:
  // the two lists are normalized differently, and a stable block order beats a
  // merged one that would reshuffle as either side changes.
  const cards = useMemo(() => {
    const entries: {
      key: string;
      rank: number;
      entry: AnyLayerCardEntry;
      layer: LayerState | SceneLayerFragment;
    }[] = [];
    // Normalized first, so a lens-backed card always edits the objects the
    // RENDERER reads. A layer appears exactly once: `source` on its registry
    // entry decides which list it is taken from, so the two passes cannot both
    // claim it.
    for (const layer of layers) {
      const entry = LAYER_CARDS[layer.__typename];
      if (entry.source !== "layerState") continue;
      entries.push({ key: layer.id, rank: entry.rank, entry, layer });
    }
    for (const layer of sceneLayers) {
      const entry = LAYER_CARDS[layer.__typename];
      if (entry.source !== "fragment") continue;
      entries.push({ key: layer.id, rank: entry.rank, entry, layer });
    }
    // Stable within a rank: `sort` preserves the order each list was walked in,
    // which is scene order.
    return entries.sort((a, b) => a.rank - b.rank);
  }, [layers, sceneLayers]);

  // NO auto-expand: unfolding used to be space-derived (`fitsExpanded`), which
  // meant a rail resize could pop every editor open at once — mounting every
  // card's full render-graph editor subtree in a single commit and making
  // every subsequent layers-store write walk all of them. Cards open only on
  // an explicit click (or the selection), one at a time.
  const isExpanded = (id: string) => expandOverrides[id] ?? id === selectedLayerId;

  return (
    // `@container/layers`: the panel sizes itself to whatever hosts it — the
    // page rail is user-resizable from 10% to 80% of the window — and the list
    // answers to THAT width, not the viewport's. No media queries: the same
    // component in the narrow in-viewport column and in a dragged-open sidebar
    // lays itself out from its own box.
    <LongCommitProfiler id="layers-panel">
    <div
      className={
        variant === "sidebar"
          ? "@container/layers flex h-full min-h-0 flex-col p-2"
          : "@container/layers pointer-events-none flex min-h-0 flex-1 flex-col items-stretch"
      }
    >
      <div
        className={
          variant === "sidebar"
            ? "flex min-h-0 flex-1 flex-col overflow-y-auto"
            : "pointer-events-auto flex max-h-full flex-col overflow-y-auto"
        }
      >
        {/* The uncommitted design session, staged where layers live: it
            renders in the scene like a layer, so it is managed like one.
            Session-local — renders null outside a design session. */}
        <DesignStagingCard />
        {/* One column while narrow; a wide rail unfolds into two and then three
            so the cards stay readable instead of stretching to a full page
            width. `items-start` keeps an unfolded card from dragging its row
            mates taller. */}
        <div className="grid grid-cols-1 items-start gap-1 @2xl/layers:grid-cols-2 @5xl/layers:grid-cols-3">
          {cards.map(({ key, entry, layer }) => {
            // The row IS the button: selecting it unfolds the editor inline
            // within the same card (one border around header + body), rather
            // than popping a separate flyout window.
            const common = {
              expanded: isExpanded(key),
              unplannable: unplannableLayers[key],
              onSelect: handleSelect,
              onUpdate: updateLayer,
              onFocus: fitToLayer,
              onRemove: handleRemove,
              onClose: handleClose,
            };
            // A layer without a server placement (`asAffine` null) is not on
            // the canvas at all — say so under its card, for every kind, in
            // the one place that sees every kind.
            const unplaceable = unplaceableReason(layer);
            return unplaceable ? (
              <div key={key} className="flex flex-col">
                {renderLayerCard(entry, layer, common)}
                <UnplaceableNotice reason={unplaceable} />
              </div>
            ) : (
              <Fragment key={key}>{renderLayerCard(entry, layer, common)}</Fragment>
            );
          })}
        </div>

        <button
          className="mt-1 self-end rounded-full border border-white/10 bg-black/40 px-2 py-0.5 text-[10px] text-white/60 backdrop-blur-md transition-colors hover:border-white/20 hover:text-white/90"
          onClick={() =>
            openDialog("addlayer", { scene: sceneId }, { className: "max-w-3xl" })
          }
        >
          + Add layer
        </button>
      </div>
    </div>
    </LongCommitProfiler>
  );
};
