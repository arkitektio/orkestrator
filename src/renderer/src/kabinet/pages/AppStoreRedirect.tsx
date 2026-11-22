import { KabinetApp } from "@/core/linkers";
import { Navigate, useParams } from "react-router-dom";
import { useListAppsQuery } from "../api/graphql";
import { QueryError } from "@/core/layout/fallbacks/ErrorPage";
import { LoadingPage } from "@/core/layout/fallbacks/LoadingPage";
import { NotFound } from "@/core/layout/fallbacks/NotFound";

/**
 * Where `kabinet/app-store/:identifier` used to land.
 *
 * The app page is a model page now, keyed by id like every other one, so the
 * old identifier-keyed URL has to be resolved before it can redirect. Kept
 * because those URLs are shareable: they are what a deeplink or a pasted link
 * from before the move still points at.
 *
 * `AppFilter.identifier` is an exact match (unique within the organization),
 * so this is one lookup.
 */
export const AppStoreRedirect = () => {
  const { identifier = "" } = useParams<{ identifier: string }>();
  const { data, loading, error, refetch } = useListAppsQuery({
    variables: { filters: { identifier }, pagination: { limit: 1 } },
    skip: !identifier,
  });

  if (error && !data) return <QueryError error={error} onRetry={() => refetch()} resource="app" />;
  if (loading) return <LoadingPage />;

  const app = data?.apps[0];
  if (!app) return <NotFound />;

  return <Navigate to={KabinetApp.linkBuilder(app.id)} replace />;
};

export default AppStoreRedirect;
