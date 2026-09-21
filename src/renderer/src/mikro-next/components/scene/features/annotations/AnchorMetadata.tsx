import { useGetLensAnchorsQuery } from "@/mikro-next/api/graphql";
import { useMemo, useState } from "react";
import {
  type AnchorMatch,
  layerCoverage,
  matchAnchor,
} from "./anchorVisibility";
import { ActiveAnchor, type PanelAnchor } from "./AnchorSpokes";
import { LayerState } from "../../platform/stores/sceneStore";
import { useViewerStore } from "../../platform/stores/viewerStore";

/**
 * The acquisition truth pinned to what this layer is currently showing.
 *
 * A dataset's `CoordinateAnchor`s pin metadata — the channel's name, its value
 * distribution, the light path it came down, the microscope state at the moment
 * of acquisition — to specific coordinates. Which of them describe the pixels on
 * screen depends on the channel toggles and the dim sliders, so the panel splits
 * them live (`features/annotations/anchorVisibility.ts` owns that rule) and shows only the ones
 * in view. The rest stay one click away rather than vanishing, because "there IS
 * a light path, just not for this timepoint" is a different answer from "no light
 * path was ever recorded".
 *
 * This is the body of the viewport's metadata overlay
 * (`MetadataOverlay.tsx`, bottom-left), which describes the ACTIVE layer —
 * not a section of every layer card: which channel a layer is and what light
 * made it is a question about what is on screen, and the answer belongs next
 * to the picture rather than folded into a list in the sidebar.
 *
 * The scene payload already carries a thin projection of these anchors (the
 * histogram the clim comes from, the label the row shows), so the panel draws
 * the instant it unfolds; `GetLensAnchors` then fills in the microscope state
 * and phasor facts that are far too heavy to ride along with every scene load.
 * The query mounts with the unfolded overlay only, and only for the one layer
 * it describes — so a scene of twenty layers fetches exactly one.
 */

// The spokes themselves (`ActiveAnchor` and the per-spoke renderers) live in
// `AnchorSpokes.tsx`, store-free, so the table dataset page can draw an
// anchor without a scene; they are re-exported here for the existing imports.

/**
 * The anchors that exist but describe something else. Worth listing: a missing
 * light path and a light path for another channel look identical otherwise.
 */
const OutOfView = ({
  entries,
}: {
  entries: { anchor: PanelAnchor; match: AnchorMatch }[];
}) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col gap-1">
      <button
        className="self-end text-[9px] uppercase tracking-widest text-white/40 transition-colors hover:text-white/70"
        onClick={() => setOpen((previous) => !previous)}
      >
        {entries.length} more out of view
      </button>
      {open &&
        entries.map(({ anchor, match }) => (
          // The coordinates are not shown; the mismatch rides on the tooltip.
          <div
            key={anchor.id}
            className="flex flex-wrap justify-end gap-1 pr-1"
            title={match.pins
              .filter((pin) => !pin.met)
              .map((pin) => `${pin.axis}: showing ${pin.current}`)
              .join(", ") || undefined}
          >
            <span className="text-[9px] text-white/40">
              {anchor.channelLabel?.label ?? "unlabelled"}
            </span>
          </div>
        ))}
    </div>
  );
};

/**
 * Split a layer's anchors into the ones describing what it currently shows and
 * the ones pinned elsewhere (`anchorVisibility.ts` owns the rule). Exported so
 * the overlay's collapsed pill can say "3 in view" from the same partition the
 * unfolded panel renders.
 */
export const partitionAnchors = (
  layer: LayerState,
  anchors: readonly PanelAnchor[],
  dimSelections: Parameters<typeof layerCoverage>[1],
): {
  active: { anchor: PanelAnchor; match: AnchorMatch }[];
  hidden: { anchor: PanelAnchor; match: AnchorMatch }[];
} => {
  const coverage = layerCoverage(layer, dimSelections);
  const active: { anchor: PanelAnchor; match: AnchorMatch }[] = [];
  const hidden: { anchor: PanelAnchor; match: AnchorMatch }[] = [];
  for (const anchor of anchors) {
    const match = matchAnchor(anchor.coordinates, coverage);
    (match.satisfied ? active : hidden).push({ anchor, match });
  }
  return { active, hidden };
};

export const AnchorMetadata = ({
  layer,
  anchors,
  loading,
}: {
  layer: LayerState;
  anchors: readonly PanelAnchor[];
  loading: boolean;
}) => {
  // The dim sliders move under us — re-partition on every selection change so
  // the panel never claims metadata for a slice that scrolled off.
  const dimSelections = useViewerStore((state) => state.dimSelections);

  const { active, hidden } = useMemo(
    () => partitionAnchors(layer, anchors, dimSelections),
    [anchors, layer, dimSelections],
  );

  // A dataset with no anchors is the common case, not a fault worth a row of
  // chrome on every layer card. Say nothing.
  if (anchors.length === 0) return null;

  return (
    <div className="flex max-h-64 min-w-0 flex-col items-end gap-1.5 overflow-y-auto text-right text-[10px]">
      {active.length === 0 ? (
        <span className="text-white/40">
          Nothing anchored to what this layer is showing.
        </span>
      ) : (
        active.map(({ anchor }) => <ActiveAnchor key={anchor.id} anchor={anchor} />)
      )}
      {hidden.length > 0 && <OutOfView entries={hidden} />}
      {loading && <span className="text-[9px] text-white/30">Loading…</span>}
    </div>
  );
};

/**
 * A layer's anchors, full payload when it has landed and the scene's thin
 * projection until then — so a consumer never flashes empty and then fills.
 * Cache-first: the anchors of a dataset do not change while it is on screen.
 */
export const useLayerAnchors = (
  layer: LayerState,
): { anchors: readonly PanelAnchor[]; loading: boolean } => {
  const { data, loading } = useGetLensAnchorsQuery({
    variables: { id: layer.lens.id },
    fetchPolicy: "cache-first",
  });
  return {
    anchors: data?.lens.activeAnchors ?? layer.lens.activeAnchors,
    loading,
  };
};

export { ActiveAnchor };
export type { PanelAnchor };
