import { PageLayout } from "@/core/layout/PageLayout";
import { toast } from "@/core/notify";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/core/ui/empty";
import { PageAction } from "@/core/ui/page-action";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/core/ui/select";
import { Spinner } from "@/core/ui/spinner";
import Timestamp from "@/core/ui/timestamp";
import { ToggleGroup, ToggleGroupItem } from "@/core/ui/toggle-group";
import { TooltipButton } from "@/core/ui/tooltip-button";
import { cn } from "@/core/util/utils";
import { CloudCheck, CloudUpload, RotateCcw, Undo2 } from "lucide-react";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useKuvert } from "../api/funcs";
import { MailChangeFragment, MailChangeState, useListMailAccountsQuery, useListMailChangesQuery } from "../api/graphql";
import { changeStatus, describeChange } from "../components/changes/describe";
import { describeError } from "../errors";
import { KUVERT_HELP } from "../help";
import { MailAccount, MailMessage } from "../linkers";
import { pushChanges, retryChanges, undoChanges } from "../mailOps";

type Filter = "all" | "pending" | "failed";

/** Where a change is, in words: its undo window, a back-off, or why it failed. */
const Status = ({ change }: { change: MailChangeFragment }) => {
  const status = changeStatus(change);
  if (status === "failed")
    return (
      <span className="text-destructive">
        {describeError(change.errorCode, { message: change.error }).text}
        {change.attempts > 1 && ` (${change.attempts} attempts)`}
      </span>
    );
  if (status === "due") return <span>Pushing at the next chance</span>;
  return (
    <span>
      {status === "backing-off" ? `Failed ${change.attempts}×, trying again ` : "Pushes "}
      <Timestamp date={change.pushAfter} relative />
    </span>
  );
};

const ChangeRow = ({ change }: { change: MailChangeFragment }) => {
  const client = useKuvert();
  const [busy, setBusy] = useState(false);
  const run = (work: () => Promise<unknown>, done: string) => {
    setBusy(true);
    work()
      .then(() => toast.success(done))
      .catch((e: Error) => toast.error(e.message))
      .finally(() => setBusy(false));
  };
  const failed = change.state === MailChangeState.Failed;

  return (
    <div className="group relative flex items-start gap-3 px-3 py-2 text-sm">
      <span className={cn("mt-0.5 size-2 shrink-0 rounded-full", failed ? "bg-destructive" : "bg-primary/60")} />
      <div className="grid min-w-0 flex-1 gap-0.5">
        <div className="flex min-w-0 items-baseline gap-2">
          <span className="shrink-0 font-medium">{describeChange(change)}</span>
          {change.message ? (
            <MailMessage.DetailLink object={change.message} className="truncate text-muted-foreground hover:text-foreground">
              {change.message.subject || "(no subject)"}
            </MailMessage.DetailLink>
          ) : (
            <span className="truncate text-muted-foreground">a mail that is gone</span>
          )}
        </div>
        <div className="flex min-w-0 items-baseline gap-2 text-xs text-muted-foreground">
          <MailAccount.DetailLink object={change.account} className="shrink-0 hover:text-foreground">
            {change.account.emailAddress}
          </MailAccount.DetailLink>
          <span>·</span>
          <span className="min-w-0 truncate">
            <Status change={change} />
          </span>
        </div>
      </div>
      <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-0.5 rounded-md bg-background opacity-0 shadow-sm transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
        {change.undoable && (
          <TooltipButton
            variant="ghost"
            size="icon-sm"
            tooltip="Undo: keep what the server has"
            disabled={busy}
            onClick={() => run(() => undoChanges(client, { changes: [change.id] }), "Undone")}
          >
            <Undo2 />
          </TooltipButton>
        )}
        {failed && (
          <TooltipButton
            variant="ghost"
            size="icon-sm"
            tooltip="Try again"
            disabled={busy}
            onClick={() => run(() => retryChanges(client, [change.id]), "Queued again")}
          >
            <RotateCcw />
          </TooltipButton>
        )}
      </div>
    </div>
  );
};

/**
 * Changes made here that have not reached the server yet, oldest first:
 * waiting out their undo window, backing off, or failed. Each can be undone
 * (while it may) or tried again.
 */
const ChangesPage = () => {
  const client = useKuvert();
  const [params, setParams] = useSearchParams();
  const account = params.get("account") ?? undefined;
  const [filter, setFilter] = useState<Filter>("all");
  const [pushing, setPushing] = useState(false);
  const accounts = useListMailAccountsQuery();
  const { data, loading } = useListMailChangesQuery({
    variables: {
      filters: {
        account,
        state: filter === "pending" ? MailChangeState.Pending : filter === "failed" ? MailChangeState.Failed : undefined,
      },
      pagination: { limit: 500 },
    },
    // Pending changes leave on their own as they are pushed.
    pollInterval: 15000,
  });
  const changes = data?.mailChanges ?? [];
  const failed = changes.filter((c) => c.state === MailChangeState.Failed);
  const pendingAccounts = account
    ? [account]
    : [...new Set(changes.filter((c) => c.state === MailChangeState.Pending).map((c) => c.account.id))];

  const setAccount = (id: string) =>
    setParams(
      (p) => {
        if (id === "all") p.delete("account");
        else p.set("account", id);
        return p;
      },
      { replace: true },
    );

  const pushAll = async () => {
    setPushing(true);
    try {
      for (const id of pendingAccounts) toast.success(await pushChanges(client, id));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setPushing(false);
    }
  };

  return (
    <PageLayout
      title="Unsynced changes"
      help={KUVERT_HELP.changes}
      pageActions={
        <>
          <PageAction.Slot collapse="hide">
            <ToggleGroup type="single" size="sm" value={filter} onValueChange={(v) => v && setFilter(v as Filter)}>
              <ToggleGroupItem value="all">All</ToggleGroupItem>
              <ToggleGroupItem value="pending">Pending</ToggleGroupItem>
              <ToggleGroupItem value="failed">Failed</ToggleGroupItem>
            </ToggleGroup>
          </PageAction.Slot>
          {(accounts.data?.mailAccounts.length ?? 0) > 1 && (
            <PageAction.Slot collapse="hide">
              <Select value={account ?? "all"} onValueChange={setAccount}>
                <SelectTrigger size="sm" className="max-w-56">
                  <SelectValue placeholder="Every mailbox" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Every mailbox</SelectItem>
                  {accounts.data?.mailAccounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.emailAddress}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </PageAction.Slot>
          )}
          {failed.length > 0 && (
            <PageAction
              size="sm"
              collapse="icon"
              icon={<RotateCcw className="h-4 w-4" />}
              onClick={() =>
                retryChanges(
                  client,
                  failed.map((c) => c.id),
                )
                  .then(() => toast.success(`Queued ${failed.length} again`))
                  .catch((e: Error) => toast.error(e.message))
              }
            >
              Retry failed
            </PageAction>
          )}
          {pendingAccounts.length > 0 && (
            <PageAction
              size="sm"
              collapse="icon"
              icon={<CloudUpload className={cn("h-4 w-4", pushing && "animate-pulse")} />}
              disabled={pushing}
              onClick={() => void pushAll()}
            >
              Push now
            </PageAction>
          )}
        </>
      }
    >
      {changes.length > 0 ? (
        <div className="flex flex-col divide-y rounded-md border">
          {changes.map((c) => (
            <ChangeRow key={c.id} change={c} />
          ))}
        </div>
      ) : loading ? (
        <div className="flex justify-center p-6">
          <Spinner className="size-5 text-muted-foreground" />
        </div>
      ) : (
        <Empty className="border-0">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CloudCheck />
            </EmptyMedia>
            <EmptyTitle>Everything is on the server</EmptyTitle>
            <EmptyDescription>
              {filter === "failed" ? "No change failed to reach the server." : "Changes made here are pushed within moments."}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </PageLayout>
  );
};

export default ChangesPage;
