import { reportErrorAs } from "@/core/notify";
import { Button } from "@/core/ui/button";
import { cn } from "@/core/util/utils";
import { RekuestAction } from "@/core/linkers";
import {
  ActionAllowanceFragment,
  useMyAllowancesQuery,
  useRevokeAllowanceMutation,
} from "@/rekuest/api/graphql";
import { Loader2, Zap } from "lucide-react";
import { useState } from "react";

/** Who may ask for it unasked: one action, or anyone. */
export const allowanceAsker = (allowance: ActionAllowanceFragment): string =>
  allowance.askerKey ? `when ${allowance.asker?.name ?? allowance.askerKey} asks` : "whoever asks";

/** Take one rule off the auto list; the lists that show it refetch. */
export const RevokeAllowanceButton = ({ allowance }: { allowance: ActionAllowanceFragment }) => {
  const [revoke] = useRevokeAllowanceMutation({ refetchQueries: ["MyAllowances"] });
  const [busy, setBusy] = useState(false);
  return (
    <Button
      size="sm"
      variant="ghost"
      className="h-7 shrink-0 text-xs text-muted-foreground"
      disabled={busy}
      onClick={() => {
        setBusy(true);
        revoke({ variables: { input: { id: allowance.id } } })
          .catch(reportErrorAs("Couldn't remove the rule"))
          .finally(() => setBusy(false));
      }}
    >
      {busy && <Loader2 className="size-3.5 animate-spin" />} Ask again
    </Button>
  );
};

/**
 * The signed-in user's auto-list rules for one action, on its page: an agent
 * that asks for it under their runs gets it without a hold. Nothing while
 * there is no rule; a rule is made from a hold ("Approve, and don't ask
 * again") or the action's menu.
 */
export const ActionAllowances = ({ action, className }: { action: string; className?: string }) => {
  const { data } = useMyAllowancesQuery({ variables: { action }, fetchPolicy: "cache-and-network" });
  const allowances = data?.myAllowances ?? [];
  if (allowances.length === 0) return null;
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      {allowances.map((allowance) => (
        <div key={allowance.id} className="flex items-center gap-2 text-sm">
          <Zap className="size-4 shrink-0 text-primary" />
          <span className="min-w-0 truncate">
            Runs without asking you, <span className="text-muted-foreground">{allowanceAsker(allowance)}</span>
          </span>
          <RevokeAllowanceButton allowance={allowance} />
        </div>
      ))}
    </div>
  );
};

/** One rule in a list of all of them: the action it lets through, and who may ask. */
export const AllowanceRow = ({ allowance }: { allowance: ActionAllowanceFragment }) => (
  <div className="flex items-center gap-3 py-2 text-sm">
    <Zap className="size-4 shrink-0 text-muted-foreground" />
    <span className="min-w-0 flex-1 truncate">
      {allowance.action ? (
        <RekuestAction.DetailLink object={allowance.action} className="hover:text-primary">
          {allowance.action.name}
        </RekuestAction.DetailLink>
      ) : (
        // No version of it is registered any more: the rule still names it.
        <span className="text-muted-foreground">
          {allowance.app.identifier}:{allowance.key}
        </span>
      )}
    </span>
    <span className="shrink-0 text-xs text-muted-foreground">{allowanceAsker(allowance)}</span>
    <RevokeAllowanceButton allowance={allowance} />
  </div>
);
