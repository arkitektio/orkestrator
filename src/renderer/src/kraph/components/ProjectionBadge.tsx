import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { GraphProjectionFragment, ProjectionStatus } from "../api/graphql";
import Timestamp from "@/components/ui/timestamp";

/**
 * Whether this view has drawn the log yet.
 *
 * A graph is a *projection* — a cache over the evidence, rebuildable from it —
 * and the question "has my write landed in the view I am looking at" previously
 * had no answer at all. It does now: the cursor is `min(min_pending_seq − 1,
 * max_seq)`, derived from an outbox rather than stored, so it is safe against
 * both an uncommitted lower seq and a commit-then-crash. `lag` is how far behind
 * `max_seq` it sits and `pending` is how many writes are owed a drawing.
 *
 * `schemaStale` is a different question: the drawing is current with the log but
 * was derived under an older schema, so its derived properties may not reflect
 * the categories as they now stand. A rematerialize fixes that; waiting does not.
 */
export const ProjectionBadge = ({
  projection,
}: {
  projection: GraphProjectionFragment;
}) => {
  const behind = projection.lag > 0 || projection.pending > 0;

  const [variant, label] =
    projection.status === ProjectionStatus.Rebuilding
      ? (["secondary", "rebuilding"] as const)
      : projection.status === ProjectionStatus.NeedsBackfill
        ? (["destructive", "needs backfill"] as const)
        : behind
          ? (["outline", `${projection.lag} behind`] as const)
          : (["secondary", "up to date"] as const);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1">
            <Badge variant={variant}>{label}</Badge>
            {projection.schemaStale && (
              <Badge variant="outline">schema stale</Badge>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="flex flex-col gap-1 text-xs">
            <div>
              Drawn through seq {projection.projectedThroughSeq}
              {projection.pending > 0 && ` · ${projection.pending} pending`}
            </div>
            {projection.derivedAt && (
              <div>
                Derived <Timestamp date={projection.derivedAt} relative />
              </div>
            )}
            {projection.schemaStale && (
              <div>
                Drawn under an older schema — its derived properties may not
                match the categories as they stand.
              </div>
            )}
            <div className="text-muted-foreground">
              Projection kind: {projection.kind}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
