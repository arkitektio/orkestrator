import { DisplayWidgetProps } from "@/lib/display/registry";
import { KraphTerm } from "@/linkers";
import { useGetTermQuery } from "../api/graphql";
import { termKindLabel, termTint } from "../lib/terms";
import { WithKraphMediaUrl } from "@/lib/datalayer/kraphAccess";

export const TermDisplay = (props: DisplayWidgetProps) => {
  const { data } = useGetTermQuery({ variables: { id: props.object } });

  if (!data?.term) {
    return <div className="text-xs text-muted-foreground">Not found</div>;
  }

  const term = data.term;

  if (props.context === "command") {
    return (
      <KraphTerm.DetailLink object={{ id: props.object }}>
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-medium text-sm truncate">{term.key}</span>
          <span className="text-xs text-muted-foreground shrink-0">
            {termKindLabel(term.kind)}
          </span>
        </div>
      </KraphTerm.DetailLink>
    );
  }

  return (
    <KraphTerm.DetailLink object={{ id: props.object }}>
      <div className="w-full rounded-lg border border-border/60 bg-card p-3 space-y-1 relative overflow-hidden">
        <div
          className="absolute inset-x-0 top-0 h-1"
          style={{ background: termTint(term.color) }}
        />
        {term.image && (
          <WithKraphMediaUrl media={term.image}>
            {(url) => (
              <img
                src={url}
                alt={term.label ?? term.key}
                loading="lazy"
                height={80}
                className="w-full h-20 object-cover rounded"
              />
            )}
          </WithKraphMediaUrl>
        )}
        <div className="font-semibold text-sm">{term.label || term.key}</div>
        <div className="text-xs text-muted-foreground">
          {term.key} · {termKindLabel(term.kind)}
        </div>
        {term.description && (
          <div className="text-xs text-muted-foreground line-clamp-2">
            {term.description}
          </div>
        )}
        {/* The word is only meaningful where a graph declares it. */}
        <div className="text-xs text-muted-foreground">
          Declared by {term.categories.length}{" "}
          {term.categories.length === 1 ? "graph" : "graphs"}
        </div>
      </div>
    </KraphTerm.DetailLink>
  );
};
