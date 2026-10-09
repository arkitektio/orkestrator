import { renderQueryState } from "@/core/layout/routes/queryState";
import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import { MikroLens } from "@/core/linkers";
import { Navigate, useLocation } from "react-router-dom";

import { DetailLensFragment, useGetArrayDatasetQuery, useGetLensQuery } from "../api/graphql";
import { LensWorkspace } from "../components/lens/LensWorkspace";

/**
 * One lens, as a place to work: its selection in a viewport, the scenes that
 * draw it, and the lens itself as the object to act on.
 *
 * This is the app's only viewer for array data. A lens is what a processing
 * step is handed — "segment this", "crop to that" — so it is the thing people
 * open, look at and launch from, whether it is a cut or the whole array. The
 * dataset is its container: the name, the folder, the files, the lineage and
 * the list of its lenses, one click up.
 *
 * **The whole array has one address.** A dataset written before lenses were
 * deduplicated can carry several lenses that cut nothing; they are the same
 * selection, the server answers alike for all of them, and so every one but the
 * dataset's `fullLens` forwards to it.
 */
export const LensPage = asDetailQueryRoute(useGetLensQuery, ({ data }) => {
  const lens = data.lens;
  const { search } = useLocation();

  const whole = lens.dataset.fullLens?.id;
  if (lens.slices.length === 0 && whole && whole !== lens.id) {
    // The query string travels with it: `?scene=` names the scene to land on.
    return <Navigate replace to={`${MikroLens.linkBuilder(whole)}${search}`} />;
  }

  return <LensViewerPage lens={lens} />;
});

/**
 * The container's half of the page: the pyramid behind the backdrop, the spaces
 * the dataset is registered into, its sibling lenses. Read with the dataset
 * page's own query, so Apollo answers from the cache when someone arrives from
 * there.
 */
const LensViewerPage = ({ lens }: { lens: DetailLensFragment }) => {
  const query = useGetArrayDatasetQuery({ variables: { id: lens.dataset.id } });

  const pending = renderQueryState(query);
  if (pending !== undefined) return pending;
  if (!query.data) return null;

  return <LensWorkspace dataset={query.data.arrayDataset} lens={lens} />;
};

export default LensPage;
