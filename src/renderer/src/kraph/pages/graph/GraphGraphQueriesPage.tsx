import { PageLayout } from "@/core/components/layout/PageLayout";
import { Badge } from "@/core/components/ui/badge";
import { Card } from "@/core/components/ui/card";
import { KraphGraphQuery } from "@/core/linkers";
import { useGetGraphQuery } from "../../api/graphql";
import { useRequiredGraphScope } from "../../providers/GraphScopeProvider";

/**
 * The graph's saved table queries.
 *
 * This page rendered a heading and an empty divider — nothing listed the
 * queries, so `/kraph/graphqueries/:id` had no inbound link except from a
 * builder run, and the builder itself could only be reached from a query that
 * already existed. Its create branch was therefore unreachable.
 *
 * One kind is listed because one kind survives: `GraphTableQuery`. The node,
 * edge, pairs and path kinds had types, mutations and filters but no execution
 * path anywhere, and went with their rows.
 */
const Page = () => {
  // A child of `graphs/:graph`, so the graph comes from scope rather than from a
  // second `:id` in the path — `graph(id:)` is one argument, not two.
  const { graphId } = useRequiredGraphScope();
  const { data } = useGetGraphQuery({ variables: { id: graphId } });

  if (!data) return null;

  const queries = data.graph.queries;

  return (
    <PageLayout title="Graph Queries">
      <div className="p-6 flex flex-col gap-4">
        <div>
          <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
            Graph Queries
          </h1>
          <p className="mt-3 text-xl text-muted-foreground">
            Saved table queries over {data.graph.name}.
          </p>
        </div>

        {queries.length === 0 ? (
          <Card className="p-6 text-sm text-muted-foreground">
            No saved queries yet. Build one from the graph's ontology canvas.
          </Card>
        ) : (
          <div className="grid gap-2 md:grid-cols-2">
            {queries.map((query) => (
              <KraphGraphQuery.DetailLink key={query.id} object={{ id: query.id }}>
                <Card className="p-4 flex flex-col gap-1 hover:bg-muted/40 transition-colors">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium truncate">{query.label}</span>
                    {query.legacy && <Badge variant="outline">legacy</Badge>}
                  </div>
                  {query.description && (
                    <span className="text-xs text-muted-foreground truncate">
                      {query.description}
                    </span>
                  )}
                </Card>
              </KraphGraphQuery.DetailLink>
            ))}
          </div>
        )}
      </div>
    </PageLayout>
  );
};

export default Page;
