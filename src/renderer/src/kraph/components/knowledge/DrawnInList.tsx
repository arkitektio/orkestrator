import type { KnowledgeInstanceFragment } from "@/kraph/api/graphql";
import { KraphGraph, KraphNode } from "@/linkers";

/**
 * Where a claim is drawn. A claim names a word the organization owns; each
 * graph that declares a category for that word draws it under that category,
 * and each row links into that graph's view of the node. Drawing in no graph
 * at all is an ordinary answer — the claim still stands, no view renders it —
 * so it gets stated rather than hidden.
 */
export const DrawnInList = ({
  drawings,
}: {
  drawings: KnowledgeInstanceFragment["drawnIn"];
}) => {
  if (drawings.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        No graph declares a category for this word, so no view draws it yet.
      </p>
    );
  }
  return (
    <ul className="flex flex-col gap-1">
      {drawings.map((drawing) => (
        <li
          key={`${drawing.graph.id}-${drawing.category.id}`}
          className="text-xs text-muted-foreground"
        >
          <KraphNode.DetailLink
            object={{ id: drawing.node.id }}
            scope={drawing.graph.id}
            className="text-foreground hover:underline"
          >
            {drawing.node.label}
          </KraphNode.DetailLink>{" "}
          as {drawing.category.label} in{" "}
          <KraphGraph.DetailLink
            object={{ id: drawing.graph.id }}
            className="text-foreground hover:underline"
          >
            {drawing.graph.name}
          </KraphGraph.DetailLink>
        </li>
      ))}
    </ul>
  );
};

export default DrawnInList;
