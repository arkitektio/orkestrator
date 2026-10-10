import { renderQueryState } from "@/core/layout/routes/queryState";
import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import { MikroLens } from "@/core/linkers";
import { Navigate, useLocation } from "react-router-dom";

import { useGetArrayDatasetQuery, useGetLensQuery } from "../api/graphql";
import { LensWorkspace } from "../components/lens/LensWorkspace";
import type { ArrayDetailLens } from "../lenses";

/**
 * One lens, as a place to work: its selection in a viewport, the scenes that
 * draw it, and the lens itself as the object to act on.
 *
 * A lens is what a processing step is handed — "segment this", "crop to that"
 * — so it is the thing people open, look at and launch from, whether it is a
 * cut or the whole container. The container is one click up: the name, the
 * folder, the files, the lineage and the list of its lenses.
 *
 * Every kind of lens opens the same workspace. An array lens brings its
 * dataset along (the pyramid behind the backdrop, the spaces it is registered
 * into); the other kinds need nothing their own query did not already answer.
 */
export const LensPage = asDetailQueryRoute(useGetLensQuery, ({ data }) => {
  const lens = data.lens;
  if (lens.__typename === "ArrayLens") return <ArrayLensPage lens={lens} />;
  return <LensWorkspace lens={lens} />;
});

/**
 * **The whole array has one address.** A dataset written before lenses were
 * deduplicated can carry several lenses that cut nothing; they are the same
 * selection, the server answers alike for all of them, and so every one but the
 * dataset's `fullLens` forwards to it. The other kinds are one row per
 * (container, selection) by construction and need no forwarding.
 */
const ArrayLensPage = ({ lens }: { lens: ArrayDetailLens }) => {
  const { search } = useLocation();

  const whole = lens.dataset.fullLens?.id;
  if (lens.slices.length === 0 && whole && whole !== lens.id) {
    // The query string travels with it: `?scene=` names the scene to land on.
    return <Navigate replace to={`${MikroLens.linkBuilder(whole)}${search}`} />;
  }

  return <LensViewerPage lens={lens} />;
};

/**
 * The container's half of the page: the pyramid behind the backdrop, the spaces
 * the dataset is registered into, its sibling lenses. Read with the dataset
 * page's own query, so Apollo answers from the cache when someone arrives from
 * there.
 */
const LensViewerPage = ({ lens }: { lens: ArrayDetailLens }) => {
  const query = useGetArrayDatasetQuery({ variables: { id: lens.dataset.id } });

  const pending = renderQueryState(query);
  if (pending !== undefined) return pending;
  if (!query.data) return null;

  return <LensWorkspace dataset={query.data.arrayDataset} lens={lens} />;
};

export default LensPage;
