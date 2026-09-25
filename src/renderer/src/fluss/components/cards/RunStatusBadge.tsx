import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { RunStatus } from "@/fluss/api/graphql";

/** Small status pill for a run: a pulsing dot while running, muted once done. */
export const RunStatusBadge = ({
  status,
  className,
}: {
  status: RunStatus;
  className?: string;
}) => {
  const running = status === RunStatus.Running;
  return (
    <Badge
      variant="outline"
      className={cn("gap-1.5 rounded-full font-normal", className)}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          running ? "bg-green-500 animate-pulse" : "bg-muted-foreground/50",
        )}
      />
      {running ? "Running" : "Completed"}
    </Badge>
  );
};

export default RunStatusBadge;
