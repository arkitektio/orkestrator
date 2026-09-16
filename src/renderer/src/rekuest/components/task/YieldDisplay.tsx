import { useDetailActionQuery } from "@/rekuest/api/graphql";
import { cn } from "@/lib/utils";
import { LiveTaskState } from "@/rekuest/hooks/useTasks";
import { WrappedReturnsContainer } from "@/rekuest/widgets/tailwind";
import { useWidgetRegistry } from "@/rekuest/widgets/WidgetsContext";

/** Renders a task's latest yielded values with the action's return ports. */
export const DynamicYieldDisplay = (props: {
  values: unknown[];
  actionId: string;
  /** Bare widgets only — no box, borders, descriptions or badges. */
  minimal?: boolean;
}) => {
  const { data } = useDetailActionQuery({
    variables: {
      id: props.actionId,
    },
  });

  const { registry } = useWidgetRegistry();

  if (!data) {
    return (
      <div
        className={cn(
          "w-full animate-pulse rounded-md bg-muted/50",
          props.minimal ? "h-6" : "h-12",
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        "w-full h-full overflow-hidden flex flex-col gap-2 items-center justify-center",
        !props.minimal &&
          "p-2 bg-muted/50 rounded-md border border-muted-foreground/10",
      )}
    >
      <WrappedReturnsContainer
        ports={data.action.returns}
        values={props.values}
        registry={registry}
        className={props.minimal ? undefined : "p-2"}
        minimal={props.minimal}
      />
    </div>
  );
};

/** Border accent for a live task state (notification cards/pills). */
export const borderColorForLiveState = (live: LiveTaskState) => {
  if (live.error) {
    return "border-red-500";
  }
  if (live.cancelled) {
    return "border-orange-500";
  }
  if (live.done) {
    return "border-green-500";
  }
  if (live.yield) {
    return "border-blue-500";
  }

  return "border-muted-foreground/10";
};
