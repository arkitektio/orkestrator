import { useMemo, useState } from "react";

import {
  MetadataChip,
  MetadataOverlayFrame,
} from "@/lib/scene/metadata/MetadataChrome";
import {
  type GetSparseDatasetAnchorsQuery,
  useGetSparseDatasetAnchorsFullQuery,
  useGetSparseDatasetAnchorsQuery,
} from "@/mikro-next/api/graphql";

import { ActiveAnchor } from "../scene/features/annotations/AnchorSpokes";
import { describePins, readTablePins } from "../tables/tableAnchors";

export type ThinSparseAnchor =
  GetSparseDatasetAnchorsQuery["sparseDataset"]["anchors"][number];

const EMPTY_ANCHORS: readonly ThinSparseAnchor[] = [];

/**
 * The acquisition truth pinned to this matrix — the sparse twin of the
 * viewport's and the table's metadata overlays, drawn with the same chrome.
 *
 * An anchor on a sparse dataset pins its spokes to positions along the
 * enumerated axes, keyed by axis name (`{obs: 12}`), or to the whole matrix
 * when it names none. What differs from the other two hosts is "in view": an
 * array shows a slab and a table a page of rows, so each has anchors that are
 * out of view; this page shows the whole matrix at once, so every anchor is in
 * view and the panel lists them all. The pins caption each box, because with
 * no slider and no rows they are the only thing saying WHERE an anchor is.
 *
 * Folded, this is one small button; the heavy payload (microscope state,
 * light paths, OME) is fetched only when it unfolds. Until it lands the panel
 * draws the thin anchors already fetched, so it never flashes empty.
 */
export const SparseAnchorsOverlay = ({ datasetId }: { datasetId: string }) => {
  const [expanded, setExpanded] = useState(false);

  // Cache-first: the anchors of a matrix do not change while it is on screen.
  const { data } = useGetSparseDatasetAnchorsQuery({
    variables: { id: datasetId },
    fetchPolicy: "cache-first",
  });
  const anchors = data?.sparseDataset.anchors ?? EMPTY_ANCHORS;

  // A matrix with no anchors is the common case, not a fault worth a button
  // in the corner of every page. Say nothing.
  if (anchors.length === 0) return null;

  return (
    <MetadataOverlayFrame
      title={`${anchors.length} ${anchors.length === 1 ? "anchor" : "anchors"}`}
      className="bottom-2 right-2"
      expanded={expanded}
      setExpanded={setExpanded}
    >
      <SparseAnchorsPanel datasetId={datasetId} anchors={anchors} />
    </MetadataOverlayFrame>
  );
};

const SparseAnchorsPanel = ({
  datasetId,
  anchors,
}: {
  datasetId: string;
  anchors: readonly ThinSparseAnchor[];
}) => {
  const { data, loading } = useGetSparseDatasetAnchorsFullQuery({
    variables: { id: datasetId },
    fetchPolicy: "cache-first",
  });

  // The thin list is the one truth of WHICH anchors there are; the full
  // payload only fills in spokes for the ones it names.
  const fullById = useMemo(
    () =>
      new Map(
        (data?.sparseDataset.anchors ?? []).map((anchor) => [anchor.id, anchor]),
      ),
    [data],
  );

  return (
    <div className="flex max-h-64 min-w-0 flex-col items-end gap-1.5 overflow-y-auto text-right text-[10px]">
      {anchors.map((anchor) => (
        <div key={anchor.id} className="flex flex-col items-end gap-0.5">
          <MetadataChip>
            {describePins(readTablePins(anchor.coordinates), "whole matrix")}
          </MetadataChip>
          <ActiveAnchor anchor={fullById.get(anchor.id) ?? anchor} />
        </div>
      ))}
      {loading && <span className="text-[9px] text-white/30">Loading…</span>}
    </div>
  );
};
