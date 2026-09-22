import { KabinetApp } from "@/linkers";
import { Navigate, useParams } from "react-router-dom";
import { useListAppsQuery } from "../api/graphql";
import { LoadingPage } from "@/app/components/fallbacks/LoadingPage";
import { NotFound } from "@/app/components/fallbacks/NotFound";

/**
 * Where `kabinet/app-store/:identifier` used to land.
 *
 * The app page is a model page now, keyed by id like every other one, so the
 * old identifier-keyed URL has to be resolved before it can redirect. Kept
 * because those URLs are shareable: they are what a deeplink or a pasted link
 * from before the move still points at.
 *
 * `AppFilter.search` matches the identifier, so this is one filtered lookup
 * rather than a scan — but it is a substring match, hence the exact check.
 */
export const AppStoreRedirect = () => {
  const { identifier = "" } = useParams<{ identifier: string }>();
  const { data, loading } = useListAppsQuery({
    variables: { filters: { search: identifier }, pagination: { limit: 20 } },
    skip: !identifier,
  });

  if (loading) return <LoadingPage />;

  const app = data?.apps.find((candidate) => candidate.identifier === identifier);
  if (!app) return <NotFound />;

  return <Navigate to={KabinetApp.linkBuilder(app.id)} replace />;
};

export default AppStoreRedirect;
