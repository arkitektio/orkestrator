import { MikroCoordinateSystem } from "@/core/linkers";
import { DetailLensFragment } from "../../api/graphql";
import { DerivedRow } from "../sidebars/DerivedDatasetsSection";

/**
 * What a lens says for itself, above its dataset's facts in the Info tab: which
 * part of the array it selects, where that selection lives, and what was
 * computed from it.
 *
 * For the whole array the table simply shows every axis at its full extent and
 * no slice, and "derived" is what was computed from the dataset's own grid.
 */
export const LensInfoSection = ({ lens }: { lens: DetailLensFragment }) => {
  const sliceFor = (axis: string) =>
    lens.slices.find((slice) => slice.axis === axis) ?? null;

  return (
    <div className="flex flex-col gap-4 border-b border-border/60 p-4">
      {/* One row per axis. A selection never drops or reorders an axis, so
          `axisNames` and `shape` line up index-for-index with the dataset's —
          which is what makes "of N" readable per row. */}
      <div className="flex flex-col gap-1">
        <div className="text-xs font-semibold">Selection</div>
        <table className="w-full text-xs">
          <thead className="text-[0.625rem] text-muted-foreground">
            <tr className="text-left">
              <th className="py-1 font-normal">Axis</th>
              <th className="py-1 font-normal">Extent</th>
              <th className="py-1 font-normal">Slice</th>
            </tr>
          </thead>
          <tbody className="font-mono">
            {lens.axisNames.map((axis, index) => {
              const slice = sliceFor(axis);
              const parent = lens.dataset.shape[index];
              return (
                <tr key={axis} className="border-t border-border/40">
                  <td className="py-1">{axis}</td>
                  <td className="py-1">
                    {lens.shape[index]}
                    {parent !== undefined && parent !== lens.shape[index] && (
                      <span className="text-muted-foreground"> of {parent}</span>
                    )}
                  </td>
                  <td className="py-1 text-muted-foreground">
                    {slice
                      ? `[${slice.start ?? ""}:${slice.stop ?? ""}${
                          slice.step != null ? `:${slice.step}` : ""
                        }]`
                      : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* The space the cut lives in, and the edge that says how far it was
          shifted from the dataset's own grid. A drawing made on the crop finds
          its way back to the dataset along it. */}
      {lens.coordinateSystem && (
        <div className="flex flex-col gap-1">
          <div className="text-xs font-semibold">Coordinate system</div>
          <MikroCoordinateSystem.DetailLink
            object={lens.coordinateSystem}
            className="break-all font-mono text-xs text-muted-foreground hover:text-primary"
          >
            {lens.coordinateSystem.name}
          </MikroCoordinateSystem.DetailLink>
          {lens.toParent && (
            <span className="text-[0.625rem] text-muted-foreground">
              {lens.toParent.__typename} back into {lens.dataset.name}
            </span>
          )}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <div className="flex flex-row items-baseline justify-between gap-2">
          <div className="text-xs font-semibold">Derived from this lens</div>
          <span className="text-xs tabular-nums text-muted-foreground">
            {lens.derivedDatasets.length}
          </span>
        </div>
        {lens.derivedDatasets.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Nothing yet. A dataset computed from this selection shows up here.
          </p>
        ) : (
          lens.derivedDatasets.map((dataset) => (
            <DerivedRow
              key={dataset.id}
              dataset={dataset}
              // Further parents beyond the primary one, as the dataset's own
              // lineage panel counts them.
              otherParents={Math.max(0, dataset.derivedFrom.length - 1)}
            />
          ))
        )}
      </div>
    </div>
  );
};
