import { DisplayWidgetProps } from "@/core/smart/display/registry";
import { KraphInstance } from "@/core/linkers";
import { useGetInstanceQuery } from "../api/graphql";
import { termKindLabel } from "../lib/terms";

/**
 * The claim itself — a word, and what kind of thing it names.
 *
 * Registered so a bare uuid surfaced in the command palette or a rekuest return
 * port resolves to something. `EntityDisplay` and the two event displays read
 * the same query: at claim grain there is nothing to tell them apart except
 * `kind`, which is exactly what this shows.
 */
export const InstanceDisplay = (props: DisplayWidgetProps) => {
  const { data } = useGetInstanceQuery({ variables: { id: props.id } });

  if (!data?.instance) {
    return <div className="text-xs text-muted-foreground">Claim not found</div>;
  }

  const instance = data.instance;
  const word = instance.term.label ?? instance.term.key;

  if (props.context === "command") {
    return (
      <KraphInstance.DetailLink object={instance}>
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-medium text-sm truncate">{word}</span>
          <span className="text-xs text-muted-foreground shrink-0">
            {termKindLabel(instance.term.kind)}
          </span>
        </div>
      </KraphInstance.DetailLink>
    );
  }

  return (
    <KraphInstance.DetailLink object={instance}>
      <div className="w-full rounded-lg border border-border/60 bg-card p-3 space-y-1">
        <div className="font-semibold text-sm">{word}</div>
        <div className="text-xs text-muted-foreground">{instance.kind}</div>
      </div>
    </KraphInstance.DetailLink>
  );
};
