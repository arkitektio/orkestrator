import { DisplayWidgetProps } from "@/core/smart/display/registry";
import { KraphInstance } from "@/core/linkers";
import { useGetInstanceQuery } from "../api/graphql";
import { termKindLabel } from "../lib/terms";

/**
 * Claim-grain, deliberately.
 *
 * Displays are registered in `app/display.tsx` and rendered from outside kraph —
 * the command palette and rekuest return ports — neither of which has a graph to
 * name. `entity(id:, graph:)` needs one and refuses a node the named view does
 * not admit, so this reads `instance(id:)` instead and shows the claim's own
 * word. `category.label` is one view's rename of that word and simply does not
 * exist out here.
 */
export const EntityDisplay = (props: DisplayWidgetProps) => {
  const { data } = useGetInstanceQuery({ variables: { id: props.id } });

  if (!data?.instance) {
    return <div className="text-xs text-muted-foreground">Entity not found</div>;
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
        <div className="text-xs text-muted-foreground">
          {termKindLabel(instance.term.kind)}
        </div>
      </div>
    </KraphInstance.DetailLink>
  );
};
