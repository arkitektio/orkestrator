import { MikroCoordinateSystem } from "@/core/linkers";
import { GetArrayDatasetQuery } from "../../api/graphql";
import {
  formatPixelSize,
  spatialPixelSizes,
  type PixelSizeEntry,
} from "../coordinates/pixelSize";

type PageDataset = GetArrayDatasetQuery["arrayDataset"];

/**
 * How big a voxel actually is.
 *
 * The dataset's own grid is unit-free — it indexes pixels, and a pixel has no
 * size until something says so. What says so is the edges out of that grid
 * into spaces whose axes carry units. So this lists one block per physical
 * space the whole lens reaches, rather than a single "pixel size": a dataset
 * can be calibrated into more than one space, and they can disagree.
 *
 * The server answers it (`ArrayLens.voxelSizes`): it follows each route past
 * the first hop, ranks rival calibrations by validity (canonical first, so a
 * person's calibration sits above the size a converter read from the file),
 * and leaves out axes in `a.u.`, which measure nothing. Reading one edge's
 * parameters here instead missed every calibration more than one hop away.
 */
export const DatasetCalibrationSection = ({
  dataset,
}: {
  dataset: PageDataset;
}) => {
  const calibrations = (dataset.fullLens?.voxelSizes ?? [])
    // A route with a `problem` cannot be a calibration (it measures space in
    // another kind of axis, or does not compose): there is no size to state.
    .filter((voxelSize) => !voxelSize.problem)
    .map(({ system, axes }) => ({
      system,
      // SPACE axes only: the route also scales the time and spectral axes, but
      // those are sampling intervals — a pixel's SIZE is a spatial fact.
      entries: spatialPixelSizes(
        axes.map(
          (entry): PixelSizeEntry => ({
            // Labelled by the physical axis it lands on, like the edge's
            // output axis was: that is where the unit lives.
            axis: entry.physicalAxis,
            value: entry.size,
            unit: entry.unit,
            type: entry.type,
          }),
        ),
      ),
    }))
    .filter(({ entries }) => entries.length > 0);

  if (calibrations.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <div className="text-xs font-semibold">Pixel size</div>
      {calibrations.map(({ system, entries }) => (
        <div key={system.id} className="flex flex-col gap-1">
          <div className="flex flex-col flex-wrap items-baseline gap-x-3 gap-y-1 font-mono text-xs">
            {entries.map((entry) => (
              <span key={entry.axis}>{formatPixelSize(entry)}</span>
            ))}
          </div>
          <MikroCoordinateSystem.DetailLink
            object={system}
            className="break-all text-[0.625rem] uppercase tracking-wide text-muted-foreground"
          >
            in {system.name}
          </MikroCoordinateSystem.DetailLink>
        </div>
      ))}
    </div>
  );
};
