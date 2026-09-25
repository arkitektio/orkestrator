import { MikroCoordinateSystem } from "@/linkers";
import { GetArrayDatasetQuery } from "../../api/graphql";
import { useDatasetWorlds } from "../arraydataset/DatasetBackdrop";
import {
  formatPixelSize,
  pixelSizeEntries,
  spatialPixelSizes,
  type PixelSizeEdge,
} from "../coordinates/pixelSize";
import { isPhysicalUnit } from "../scene/platform/coords/sceneUnits";

type PageDataset = GetArrayDatasetQuery["arrayDataset"];

/**
 * How big a voxel actually is.
 *
 * The dataset's own grid is unit-free — it indexes pixels, and a pixel has no
 * size until something says so. What says so is an edge out of that grid into a
 * space whose axes carry units, and the edge's own parameters ARE the pixel
 * size. So this lists one block per calibrated space the dataset transforms
 * through, rather than a single "pixel size": a dataset can be calibrated into
 * more than one space, and they can disagree.
 *
 * Reuses `useDatasetWorlds`, which the backdrop already runs — one graph query
 * shared through the Apollo cache, not a second round trip.
 */
export const DatasetCalibrationSection = ({
  dataset,
}: {
  dataset: PageDataset;
}) => {
  const worlds = useDatasetWorlds(dataset);

  const calibrations = worlds
    .map(({ system, edge }) => ({
      system,
      // SPACE axes only: the edge also scales the time and spectral axes, but
      // those are sampling intervals — a pixel's SIZE is a spatial fact.
      entries: spatialPixelSizes(
        pixelSizeEntries(edge as PixelSizeEdge, system.axes),
      ),
    }))
    // Units are the test, not "has a scale edge": a pyramid level maps into its
    // dataset's grid by a scale too, but into unitless pixels — that is a
    // resolution, not a pixel size.
    .filter(({ entries }) =>
      entries.some((entry) => entry.unit && isPhysicalUnit(entry.unit)),
    );

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
