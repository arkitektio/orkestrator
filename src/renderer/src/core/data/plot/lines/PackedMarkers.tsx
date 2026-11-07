import { useBandValueMatrix } from "../marks/bandValueMatrix";
import { useScreenMarkers, type MarkerShape } from "../marks/screenMarkers";
import { bandKey } from "../stores/viewerStore";
import type { PackedChannel } from "./tracePacking";

/**
 * A packed channel's points as markers of a shape (`screenMarkers.ts`), in its
 * row: the same band matrix a `PackedLine` is placed by, so a marker sits
 * exactly on the line through it and moves with every relayout without a
 * repack. `packed` is a dot buffer (`markerDots`): one pair per point.
 */
export const PackedMarkers = ({
  layerId,
  channel,
  color,
  size,
  shape,
  packed,
}: {
  layerId: string;
  channel: number;
  color: string;
  /** In CSS pixels. */
  size: number;
  shape: MarkerShape;
  packed: PackedChannel;
}) => {
  const mesh = useScreenMarkers({ pairs: packed.pairs, count: packed.segmentCount, color, size, shape });
  useBandValueMatrix(mesh, bandKey(layerId, channel), packed.segmentCount > 0);
  return <primitive object={mesh} renderOrder={3} />;
};
