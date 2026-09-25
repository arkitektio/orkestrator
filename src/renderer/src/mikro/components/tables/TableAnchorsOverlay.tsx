import { useMemo, useState } from "react";

import {
  MetadataChip,
  MetadataOverlayFrame,
} from "@/lib/scene/metadata/MetadataChrome";
import {
  type GetTableDatasetAnchorsQuery,
  useGetTableDatasetAnchorsFullQuery,
} from "@/mikro/api/graphql";

import { ActiveAnchor } from "../scene/features/annotations/AnchorSpokes";
import {
  describeTablePins,
  type TableAnchorPartition,
  type TablePin,
} from "./tableAnchors";

export type ThinTableAnchor =
  GetTableDatasetAnchorsQuery["tableDataset"]["anchors"][number];

/**
 * The acquisition truth pinned to the rows on this page — the table's twin of
 * the viewport's metadata overlay, and drawn with the same chrome.
 *
 * An array layer's anchors are in view when the sliders sit on the slice they
 * pin; a table's when some row on the page carries the values they pin. The
 * partition that decides it is computed once by the table (`tableAnchors.ts`)
 * and shared with the row markers, so the collapsed pill, the glyphs in the
 * `#` column and this panel can never disagree about what is in view.
 *
 * Folded, this is one small button; the heavy payload (microscope state,
 * light paths, OME) is fetched only when it unfolds, exactly as
 * `GetLensAnchors` is on the array side. Until it lands the panel draws the
 * thin anchors the table already holds, so it never flashes empty.
 */
export const TableAnchorsOverlay = ({
  tableId,
  anchors,
  partition,
}: {
  tableId: string;
  anchors: readonly ThinTableAnchor[];
  partition: TableAnchorPartition<ThinTableAnchor>;
}) => {
  const [expanded, setExpanded] = useState(false);

  // A table with no anchors is the common case, not a fault worth a button
  // in the corner of every table. Say nothing.
  if (anchors.length === 0) return null;

  return (
    <MetadataOverlayFrame
      title={`${partition.inView.length} of ${anchors.length} anchors in view`}
      className="bottom-2 right-2"
      expanded={expanded}
      setExpanded={setExpanded}
    >
      <TableAnchorsPanel tableId={tableId} partition={partition} />
    </MetadataOverlayFrame>
  );
};

const TableAnchorsPanel = ({
  tableId,
  partition,
}: {
  tableId: string;
  partition: TableAnchorPartition<ThinTableAnchor>;
}) => {
  // Cache-first: the anchors of a table do not change while it is on screen.
  const { data, loading } = useGetTableDatasetAnchorsFullQuery({
    variables: { id: tableId },
    fetchPolicy: "cache-first",
  });

  // Not a re-partition on the full list: the table's partition is the one
  // truth, and the full payload only fills in spokes for anchors it named.
  const fullById = useMemo(
    () => new Map((data?.tableDataset.anchors ?? []).map((anchor) => [anchor.id, anchor])),
    [data],
  );

  return (
    <div className="flex max-h-64 min-w-0 flex-col items-end gap-1.5 overflow-y-auto text-right text-[10px]">
      {partition.inView.length === 0 ? (
        <span className="text-white/40">
          Nothing anchored to the rows on this page.
        </span>
      ) : (
        partition.inView.map(({ anchor, pins }) => (
          // The pins are the anchor's identity on a table — there is no
          // slider saying where we are — so they caption the box.
          <div key={anchor.id} className="flex flex-col items-end gap-0.5">
            <MetadataChip>{describeTablePins(pins)}</MetadataChip>
            <ActiveAnchor anchor={fullById.get(anchor.id) ?? anchor} />
          </div>
        ))
      )}
      {partition.outOfView.length > 0 && (
        <OutOfView entries={partition.outOfView} />
      )}
      {loading && <span className="text-[9px] text-white/30">Loading…</span>}
    </div>
  );
};

/**
 * The anchors pinned to values no row on this page has. Worth listing: a
 * channel that was never labelled and a label for a channel on another page
 * look identical otherwise.
 */
const OutOfView = ({
  entries,
}: {
  entries: readonly { anchor: ThinTableAnchor; pins: TablePin[] }[];
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
        entries.map(({ anchor, pins }) => (
          <div key={anchor.id} className="flex flex-wrap justify-end gap-1 pr-1">
            <span className="text-[9px] text-white/40">
              {anchor.channelLabel?.label ? `${anchor.channelLabel.label} · ` : ""}
              {describeTablePins(pins)}
            </span>
          </div>
        ))}
    </div>
  );
};
