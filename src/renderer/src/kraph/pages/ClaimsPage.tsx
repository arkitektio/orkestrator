import { PageLayout } from "@/core/layout/PageLayout";
import { HomeEmpty } from "@/core/layout/ModuleHome";
import { QueryError } from "@/core/layout/fallbacks/ErrorPage";
import { reportErrorAs } from "@/core/notify";
import { Button } from "@/core/ui/button";
import { useListClaimActsQuery } from "../api/graphql";
import { ClaimActList } from "../components/lists/ClaimActList";
import { KRAPH_HELP } from "../help";

const PAGE = 50;

/** The log itself, newest first: everything said, whether or not a view draws it. */
const Page = () => {
  const { data, loading, error, refetch, fetchMore } = useListClaimActsQuery({
    variables: { pagination: { limit: PAGE } },
    notifyOnNetworkStatusChange: true,
  });
  const acts = data?.assertions;

  if (error && !acts) return <QueryError error={error} onRetry={() => refetch()} />;

  const more = () =>
    fetchMore({
      variables: { pagination: { limit: PAGE, offset: acts?.length ?? 0 } },
      updateQuery: (previous, { fetchMoreResult }) => ({
        assertions: [...previous.assertions, ...fetchMoreResult.assertions],
      }),
    }).catch(reportErrorAs("Couldn't load more claims"));

  return (
    <PageLayout title="Claims" help={KRAPH_HELP.claims}>
      <div className="p-6">
        {acts && acts.length === 0 ? (
          <HomeEmpty title="Nothing claimed yet">
            Right-click a datum anywhere in the app to say what it means.
          </HomeEmpty>
        ) : null}
        {acts && acts.length > 0 ? <ClaimActList acts={acts} /> : null}
        {acts && acts.length > 0 && acts.length % PAGE === 0 ? (
          <Button variant="outline" size="sm" className="mt-4" disabled={loading} onClick={more}>
            Load more
          </Button>
        ) : null}
      </div>
    </PageLayout>
  );
};

export default Page;
