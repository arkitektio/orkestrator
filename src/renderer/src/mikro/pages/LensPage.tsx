import { asDetailQueryRoute } from "@/app/routes/DetailQueryRoute";
import { MikroArrayDataset, MikroCoordinateSystem, MikroLens } from "@/linkers";

import { useGetLensQuery } from "../api/graphql";
import { lensLabel } from "../lenses";

/**
 * One lens: what it selects out of its dataset, and where that selection lives.
 *
 * A lens is not a thing you look at, it is a thing you look THROUGH — a named
 * selection over an array dataset. So the page leads with the selection itself
 * (the axes, their extents, and which of them are cut) and hands off everywhere
 * a lens actually points: the dataset it reads, and the coordinate system its
 * selection lives in.
 *
 * The page exists because `@mikro/lens` is a registered smart model, and the
 * generic "Open" / "Open in new window" actions in `app/localactions.tsx` apply
 * to EVERY registered model — so the route has to resolve to something. It is
 * deliberately informational rather than a viewport: rendering a lens means
 * building a brick pool, which is a scene's job, and a lens reaches its scenes
 * through the layers over it.
 */
export const LensPage = asDetailQueryRoute(useGetLensQuery, ({ data }) => {
  const lens = data.lens;

  // A lens has no name of its own — it borrows its dataset's, and the slice
  // line is what tells two lenses of one dataset apart.
  const label = lensLabel(lens);
  const sliceFor = (axis: string) =>
    lens.slices.find((slice) => slice.axis === axis) ?? null;

  return (
    <MikroLens.ModelPage
      object={lens}
      title={lens.dataset.name}
      actions={<MikroLens.Actions object={lens} />}
    >
      <div className="flex flex-col gap-6 p-6">
        <div className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">
            Selection
          </span>
          <span className="font-mono text-sm">{label}</span>
        </div>

        {/* One row per axis. A selection never drops or reorders an axis, so
            `axisNames` and `shape` line up index-for-index with the dataset's
            — which is what makes "cut from N" readable per row. */}
        <div className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">
            Axes
          </span>
          <table className="w-full max-w-lg text-sm">
            <thead className="text-xs text-muted-foreground">
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

        <div className="flex flex-col gap-2">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">
            Points at
          </span>
          <MikroArrayDataset.DetailLink
            object={lens.dataset}
            className="text-sm hover:text-primary"
          >
            {lens.dataset.name}
          </MikroArrayDataset.DetailLink>
          {lens.coordinateSystem && (
            <MikroCoordinateSystem.DetailLink
              object={lens.coordinateSystem}
              className="text-sm hover:text-primary"
            >
              {lens.coordinateSystem.name}
            </MikroCoordinateSystem.DetailLink>
          )}
        </div>

        {/* `toParent` is null exactly when the lens is unsliced: its space IS
            the dataset's intrinsic grid, so there is no shift to record. Saying
            so is more useful than hiding the row. */}
        <div className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">
            Edge to the pixel grid
          </span>
          <span className="text-sm text-muted-foreground">
            {lens.toParent
              ? `${lens.toParent.__typename} — the selection's offset back into ${lens.dataset.name}`
              : "None — this lens selects the whole array, so its space is the dataset's own grid"}
          </span>
        </div>
      </div>
    </MikroLens.ModelPage>
  );
});

export default LensPage;
