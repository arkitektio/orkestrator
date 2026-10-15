import React from "react";
import { Card } from "@/core/ui/card";
import { ExploreTermFragment } from "@/kraph/api/graphql";
import { KraphTerm } from "@/core/linkers";
import { termKindLabel, termTint } from "@/kraph/lib/terms";
import { cn } from "@/core/util/utils";
import { EyeOff } from "lucide-react";

interface Props {
  item: ExploreTermFragment;
}

/**
 * One word of the vocabulary: the word, what sort of thing it names, what it
 * means, and how many graphs speak it. A hidden word is muted, not removed —
 * the explorer only lists it when asked to.
 */
const TheCard = ({ item }: Props) => {
  const graphs = new Set(item.categories.map((category) => category.graph.id)).size;

  return (
    <KraphTerm.Smart object={item}>
      <Card
        className={cn(
          "group relative flex h-full flex-col gap-1 overflow-hidden p-3 pt-4",
          item.hidden && "opacity-60",
        )}
      >
        <div className="absolute inset-x-0 top-0 h-1" style={{ background: termTint(item.color) }} />
        <div className="flex items-baseline justify-between gap-2">
          <KraphTerm.DetailLink object={item} className="truncate font-semibold">
            {item.key}
          </KraphTerm.DetailLink>
          {item.hidden && <EyeOff className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-label="Hidden" />}
        </div>
        {item.label && item.label !== item.key && (
          <div className="truncate text-sm">{item.label}</div>
        )}
        {item.description && (
          <p className="line-clamp-2 text-xs text-muted-foreground">{item.description}</p>
        )}
        <div className="mt-auto flex items-center justify-between gap-2 pt-2 text-xs text-muted-foreground">
          <span>{termKindLabel(item.kind)}</span>
          <span className={cn(graphs === 0 && "italic")}>
            {graphs === 0 ? "No graph yet" : `${graphs} ${graphs === 1 ? "graph" : "graphs"}`}
          </span>
        </div>
      </Card>
    </KraphTerm.Smart>
  );
};

export default React.memo(TheCard);
