import { DisplayWidgetProps } from "@/core/smart/display/registry";
import { KraphGraph } from "@/core/linkers";
import { useGetGraphQuery } from "../api/graphql";

export const GraphDisplay = (props: DisplayWidgetProps) => {
  const { data } = useGetGraphQuery({ variables: { id: props.id } });

  if (!data?.graph) {
    return <div className="text-xs text-muted-foreground">Graph not found</div>;
  }

  const graph = data.graph;

  if (props.context === "command") {
    return (
      <KraphGraph.DetailLink object={graph}>
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-medium text-sm truncate">{graph.name}</span>
          {graph.description && (
            <span className="text-xs text-muted-foreground truncate">{graph.description}</span>
          )}
        </div>
      </KraphGraph.DetailLink>
    );
  }

  return (
    <KraphGraph.DetailLink object={graph}>
      <div className="w-full rounded-lg border border-border/60 bg-card p-3 space-y-1">
        <div className="font-semibold text-sm">{graph.name}</div>
        {graph.description && (
          <div className="text-xs text-muted-foreground line-clamp-2">{graph.description}</div>
        )}
        <div className="text-xs text-muted-foreground">
          {graph.entityCategories?.length ?? 0} entity categories
        </div>
      </div>
    </KraphGraph.DetailLink>
  );
};
