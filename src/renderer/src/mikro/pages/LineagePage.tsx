import { renderQueryState } from "@/core/layout/routes/queryState";
import { NotFound } from "@/core/layout/fallbacks/NotFound";
import { PageLayout } from "@/core/layout/PageLayout";
import { useParams } from "react-router-dom";
import { useGetLineageQuery } from "../api/graphql";
import { kindFromSegment, KIND_LABEL } from "../components/lineage/lineageGraph";
import { LineageFlow } from "../components/lineage/LineageFlow";
import { MIKRO_HELP } from "../help";

/**
 * The lineage around one object, at `/mikro/lineage/:kind/:id`: one hop of
 * what it was made from and three of what was made from it, as the canvas the
 * page is. Stepping further is the canvas' own business (its "+" buttons).
 *
 * Not a model page: the object is any of seven kinds, and its own page is one
 * click away from the selection panel.
 */
export const LineagePage = () => {
  const { kind: segment, id } = useParams();
  const kind = kindFromSegment(segment);

  const query = useGetLineageQuery({
    variables: { start: { kind: kind!, id: id! }, up: 1, down: 3 },
    skip: !kind || !id,
    // Reopening after a task ran should show what it made, not the answer
    // from before it started; a newer answer folds into the open graph.
    fetchPolicy: "cache-and-network",
  });

  if (!kind || !id) return <NotFound />;
  const fallback = renderQueryState(query);
  if (fallback !== undefined) return <>{fallback}</>;

  const lineage = query.data!.lineage;
  const root = lineage.nodes.find((node) => node.key === lineage.root);

  return (
    <PageLayout
      title={`Lineage of ${root?.name || KIND_LABEL[kind]}`}
      help={MIKRO_HELP.lineage}
    >
      <div className="h-full w-full">
        {/* Keyed by root: "Lineage from here" is a new graph, not a merge. */}
        <LineageFlow key={lineage.root} answer={lineage} />
      </div>
    </PageLayout>
  );
};

export default LineagePage;
