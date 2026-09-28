import { toast } from "@/core/notify";
import { Button } from "@/core/ui/button";
import { cn } from "@/core/util/utils";
import { CloudAlert, CloudUpload } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useKuvert } from "../../api/funcs";
import { ListMailAccountFragment } from "../../api/graphql";
import { pushChanges } from "../../mailOps";

export const changesRoute = (account?: string) => (account ? `/kuvert/changes?account=${account}` : "/kuvert/changes");

/**
 * A mailbox's changes that have not reached the server, as one line on its
 * page: how many, push them now, or review them. Nothing while all is pushed.
 */
export const AccountChanges = ({
  account,
}: {
  account: Pick<ListMailAccountFragment, "id" | "pendingChanges" | "failedChanges">;
}) => {
  const client = useKuvert();
  const [pushing, setPushing] = useState(false);
  const { pendingChanges: pending, failedChanges: failed } = account;
  if (pending + failed === 0) return null;

  const push = () => {
    setPushing(true);
    pushChanges(client, account.id)
      .then((text) => toast.success(text))
      .catch((e: Error) => toast.error(e.message))
      .finally(() => setPushing(false));
  };

  const parts = [
    pending > 0 && `${pending} ${pending === 1 ? "change" : "changes"} on the way to the server`,
    failed > 0 && `${failed} failed`,
  ].filter(Boolean);

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm",
        failed > 0 ? "border-destructive/40 text-destructive" : "text-muted-foreground",
      )}
    >
      {failed > 0 ? <CloudAlert className="size-4 shrink-0" /> : <CloudUpload className="size-4 shrink-0" />}
      <span className="min-w-0 flex-1 truncate">{parts.join(" · ")}</span>
      {pending > 0 && (
        <Button size="xs" variant="ghost" disabled={pushing} onClick={push}>
          {pushing ? "Pushing…" : "Push now"}
        </Button>
      )}
      <Button size="xs" variant="outline" asChild>
        <Link to={changesRoute(account.id)}>Review</Link>
      </Button>
    </div>
  );
};
