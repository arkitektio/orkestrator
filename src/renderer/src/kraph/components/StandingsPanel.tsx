import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { StandingFragment } from "../api/graphql";
import Timestamp from "@/components/ui/timestamp";

/**
 * Who has taken what position on a claim, and when.
 *
 * The evidence layer is append-only: a retraction does not delete anything and
 * an attestation does not overwrite anything — both write a new `Standing`, and
 * the current answer is the fold over all of them. So this is a history, not a
 * status, and the ordering is the point.
 *
 * An `Assertion` is the *act*: who claimed it, with which app and action, and
 * where it sits in the organization-wide log (`seq`). It is not the claim, which
 * is why a claim and its standings are two different reads.
 */
export const StandingsPanel = ({
  standings,
}: {
  standings: StandingFragment[];
}) => {
  if (standings.length === 0) {
    return (
      <div className="p-3 text-sm text-muted-foreground">
        No positions recorded. The claim stands as asserted.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-3">
      {standings.map((standing) => (
        <Card key={standing.id} className="p-3 flex flex-col gap-1">
          <div className="flex items-center justify-between gap-2">
            <Badge variant={standing.stands ? "secondary" : "destructive"}>
              {standing.stands ? "stands" : "retracted"}
            </Badge>
            <span className="text-xs text-muted-foreground">
              <Timestamp date={standing.at} relative />
            </span>
          </div>
          <div className="text-xs text-muted-foreground">
            {standing.assertion.subject}
            {standing.assertion.actionName
              ? ` · ${standing.assertion.actionName}`
              : ""}
          </div>
          <div className="text-xs text-muted-foreground font-mono">
            seq {standing.assertion.seq}
          </div>
        </Card>
      ))}
    </div>
  );
};
