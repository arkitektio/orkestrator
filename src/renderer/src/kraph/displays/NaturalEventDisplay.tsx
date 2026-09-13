import { DisplayWidgetProps } from "@/lib/display/registry";
import { KraphInstance } from "@/linkers";
import { useGetInstanceQuery } from "../api/graphql";
import Timestamp from "@/components/ui/timestamp";

/**
 * Claim-grain, deliberately — see `EntityDisplay`. Displays render from outside
 * kraph (command palette, rekuest return ports) where there is no graph to name,
 * and the view-grain read requires one.
 */
export const NaturalEventDisplay = (props: DisplayWidgetProps) => {
  const { data } = useGetInstanceQuery({ variables: { id: props.object } });

  if (!data?.instance) {
    return <div className="text-xs text-muted-foreground">Event not found</div>;
  }

  const instance = data.instance;
  const word = instance.term.label ?? instance.term.key;

  if (props.context === "command") {
    return (
      <KraphInstance.DetailLink object={instance}>
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-medium text-sm truncate">{word}</span>
        </div>
      </KraphInstance.DetailLink>
    );
  }

  return (
    <KraphInstance.DetailLink object={instance}>
      <div className="w-full rounded-lg border border-border/60 bg-card p-3 space-y-1">
        <div className="font-semibold text-sm">{word}</div>
        {/*
          `measuredFrom` / `measuredTo` are gone. An event's own window was a
          derived property of the drawing; when the claim was recorded is a fact
          about the claim, and it is the one that survives a reproject.
        */}
        <div className="text-xs text-muted-foreground">
          <Timestamp date={instance.createdAt} relative />
        </div>
      </div>
    </KraphInstance.DetailLink>
  );
};
