import { MikroCoordinateSystem } from "@/core/linkers";
import { StructureDisplay } from "@/core/smart/display/StructureDisplay";
import { DetailLensFragment } from "../../api/graphql";
import { describeLens, type ArrayDetailLens } from "../../lenses";
import { DerivedRow } from "../sidebars/DerivedDatasetsSection";
import { LensContainerLink } from "./LensContainerLink";

/**
 * What a lens says for itself in the Info tab: what it selects from, which part
 * it selects, where that selection lives, who asked for it, and — for an array
 * — what was computed from it.
 *
 * An array lens selects by slices and shows every axis; the other kinds select
 * by windows and show only the axes they constrain, because an unconstrained
 * axis of a table has no extent to state.
 */
export const LensInfoSection = ({ lens }: { lens: DetailLensFragment }) => {
  const { info } = describeLens(lens);

  return (
    <div className="flex flex-col gap-4 border-b border-border/60 p-4">
      <div className="flex flex-col gap-1">
        <div className="text-xs font-semibold">{info.container}</div>
        <LensContainerLink
          lens={lens}
          className="break-all text-xs text-muted-foreground hover:text-primary"
        />
      </div>

      {lens.__typename === "ArrayLens" ? (
        <SliceTable lens={lens} />
      ) : (
        <WindowTable windows={lens.windows} />
      )}

      {/* The space the selection lives in. For a cut array that is its own
          space, with the edge that says how far it was shifted from the
          dataset's grid; for every other kind it is the container's. */}
      {lens.coordinateSystem && (
        <div className="flex flex-col gap-1">
          <div className="text-xs font-semibold">Coordinate system</div>
          <MikroCoordinateSystem.DetailLink
            object={lens.coordinateSystem}
            className="break-all font-mono text-xs text-muted-foreground hover:text-primary"
          >
            {lens.coordinateSystem.name}
          </MikroCoordinateSystem.DetailLink>
          {lens.__typename === "ArrayLens" && lens.toParent && (
            <span className="text-[0.625rem] text-muted-foreground">
              {lens.toParent.__typename} back into {lens.dataset.name}
            </span>
          )}
        </div>
      )}

      {/* When the selection was first asked for, and by whom. A whole lens
          dates from its container. */}
      <div className="flex flex-col gap-1">
        <div className="text-xs font-semibold">Created</div>
        <div className="flex flex-row items-center gap-2 text-xs text-muted-foreground">
          <span>{new Date(lens.createdAt).toLocaleString()}</span>
          {lens.creator && <StructureDisplay identifier="@lok/user" id={lens.creator.sub} />}
        </div>
      </div>

      {lens.__typename === "ArrayLens" && <DerivedFromLens lens={lens} />}
    </div>
  );
};

/** One row per axis. A selection never drops or reorders an axis, so
 *  `axisNames` and `shape` line up index-for-index with the dataset's — which
 *  is what makes "of N" readable per row. */
const SliceTable = ({ lens }: { lens: ArrayDetailLens }) => {
  const sliceFor = (axis: string) =>
    lens.slices.find((slice) => slice.axis === axis) ?? null;

  return (
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
  );
};

/** The windows of a non-array lens: inclusive, either side possibly open.
 *  Nothing at all for a whole lens, which constrains no axis. */
const WindowTable = ({
  windows,
}: {
  windows: readonly { axis: string; min?: number | null; max?: number | null }[];
}) => {
  if (windows.length === 0) return null;

  return (
    <div className="flex flex-col gap-1">
      <div className="text-xs font-semibold">Selection</div>
      <table className="w-full text-xs">
        <thead className="text-[0.625rem] text-muted-foreground">
          <tr className="text-left">
            <th className="py-1 font-normal">Axis</th>
            <th className="py-1 font-normal">From</th>
            <th className="py-1 font-normal">To</th>
          </tr>
        </thead>
        <tbody className="font-mono">
          {windows.map((window) => (
            <tr key={window.axis} className="border-t border-border/40">
              <td className="py-1">{window.axis}</td>
              <td className="py-1">{window.min ?? "—"}</td>
              <td className="py-1">{window.max ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const DerivedFromLens = ({ lens }: { lens: ArrayDetailLens }) => {
  // Nothing computed from it yet: no heading over an empty list.
  if (lens.derivedDatasets.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-row items-baseline justify-between gap-2">
        <div className="text-xs font-semibold">Derived from this lens</div>
        <span className="text-xs tabular-nums text-muted-foreground">
          {lens.derivedDatasets.length}
        </span>
      </div>
      {lens.derivedDatasets.map((dataset) => (
        <DerivedRow
          key={dataset.id}
          dataset={dataset}
          // Further parents beyond the primary one, as the dataset's own
          // lineage panel counts them.
          otherParents={Math.max(0, dataset.derivedFrom.length - 1)}
        />
      ))}
    </div>
  );
};
