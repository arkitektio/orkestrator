import { useSelf } from "@/core/connection/useSelf";
import { useDialog } from "@/core/dialogs/registry";
import { toast } from "@/core/notify";
import { Button } from "@/core/ui/button";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/core/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/core/ui/select";
import Timestamp from "@/core/ui/timestamp";
import { cn } from "@/core/util/utils";
import { buildAssignInput } from "@/rekuest/assign";
import { useApprovalInstallersQuery } from "@/rekuest/api/graphql";
import { useAssign } from "@/rekuest/hooks/useAssign";
import { CheckCircle2, Rocket, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { useGetApprovableReleaseQuery } from "../api/graphql";
import { releaseIdentity } from "../appIdentity";
import { AppIcon } from "../components/AppIcon";
import { deployableApprovals, hostsOf, isApprovalInstaller } from "../lib/approvals";
import { NoPluginEngine, Section } from "./parts";

const APPROVAL_IDENTIFIER = "@kabinet/approval";

/**
 * Deploy an installed release: hand one of your approvals of it to a host of
 * the deployer it names, which runs its `install(approval)` and starts the
 * release there, signed in as you. Authorizing (the first step of
 * `installrelease`, which shows this dialog as its second) only approves;
 * this is the step that sends it to a backend. Without an approval there is
 * nothing to deploy under, so it offers to authorize first; without any
 * deployer there is nowhere to send it, which is the admin's to fix.
 */
export const DeployReleaseDialog = (props: {
  release: string;
  approval?: string;
  agent?: string;
  /** Set by the install dialog showing this as its second step: back to its first. */
  onAuthorize?: () => void;
  /** The approval was made a moment ago in that first step, not found. */
  justAuthorized?: boolean;
}) => {
  const { closeDialog, openDialog } = useDialog();
  const self = useSelf();
  const { data, error } = useGetApprovableReleaseQuery({ variables: { id: props.release } });
  const installersQuery = useApprovalInstallersQuery();
  const { assign } = useAssign();

  const release = data?.release;
  const approvals = useMemo(
    () => deployableApprovals(release?.approvals ?? [], self.userId),
    [release, self.userId],
  );

  const [chosenApproval, setChosenApproval] = useState<string | undefined>(props.approval);
  const approval =
    approvals.find((candidate) => candidate.id === chosenApproval) ??
    approvals.find((candidate) => candidate.agent === props.agent) ??
    approvals.at(0);

  const installers = useMemo(
    () => (installersQuery.data?.implementations ?? []).filter(isApprovalInstaller),
    [installersQuery.data],
  );
  const noDeployers = installersQuery.data && installers.length === 0;
  const hosts = useMemo(() => (approval ? hostsOf(installers, approval.agent) : []), [installers, approval]);
  // Your approval names a deployer app that has no host (any more), while
  // others do: authorizing one of those is the way on.
  const stranded = approval && installersQuery.data && !noDeployers && hosts.length === 0;
  const [chosenHost, setChosenHost] = useState<string | undefined>();
  const host = hosts.find((candidate) => candidate.id === chosenHost) ?? hosts.at(0);
  const argKey = host?.action.args.at(0)?.key;

  const [busy, setBusy] = useState(false);

  const deploy = async () => {
    if (!release || !approval || !host || !argKey) return;
    setBusy(true);
    try {
      await assign({
        ...buildAssignInput({
          args: { [argKey]: { object: approval.id, __identifier: APPROVAL_IDENTIFIER } },
        }),
        implementation: host.id,
      });
      toast.success(`Deploying ${release.name} on ${host.agent.name}`);
      closeDialog();
    } catch (cause) {
      toast.error(`The deploy did not start: ${cause instanceof Error ? cause.message : String(cause)}`);
    } finally {
      setBusy(false);
    }
  };

  if (error) {
    return <p className="text-sm text-destructive">Could not load the release: {error.message}</p>;
  }
  if (!release) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  const identity = releaseIdentity(release);
  const authorize =
    props.onAuthorize ??
    (() =>
      openDialog(
        "installrelease",
        { release: props.release, agent: props.agent, authorize: true },
        { className: "max-w-xl" },
      ));

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <DialogHeader>
        <div className="flex items-center gap-3">
          <AppIcon app={identity} size={40} className="size-10" />
          <div className="min-w-0">
            <DialogTitle>
              Deploy {identity.name} <span className="font-mono text-base text-muted-foreground">v{release.version}</span>
            </DialogTitle>
            <DialogDescription className="mt-1 text-sm font-light">
              Starts it on a backend, signed in as you under your approval.
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      {approval && (
        <p className="flex items-start gap-2 text-sm">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>
            {props.justAuthorized ? (
              <>
                Authorized. <span className="font-mono">{approval.agent}</span> may now start it as you.
              </>
            ) : (
              <>
                Already authorized for <span className="font-mono">{approval.agent}</span>{" "}
                <Timestamp date={approval.createdAt} relative />.
              </>
            )}
          </span>
        </p>
      )}

      {noDeployers ? (
        <NoPluginEngine />
      ) : approvals.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Authorize this release first: that lets a deployer start it as you.
        </p>
      ) : (
        <>
          {approvals.length > 1 && (
            <Section title="Under">
              <Select value={approval?.id} onValueChange={setChosenApproval}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {approvals.map((candidate) => (
                    <SelectItem key={candidate.id} value={candidate.id}>
                      <span className="font-mono text-xs">{candidate.agent}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Section>
          )}

          <Section title="Backend">
            {installersQuery.error ? (
              <p className="text-sm text-destructive">{installersQuery.error.message}</p>
            ) : installersQuery.data && hosts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No host of <span className="font-mono">{approval?.agent}</span> is registered. Authorize
                another deployer to deploy with that one.
              </p>
            ) : hosts.length === 1 && host ? (
              <p className="text-sm">
                <span className={cn("font-medium", !host.agent.connected && "text-muted-foreground")}>
                  {host.agent.name}
                </span>
                {!host.agent.connected && <span className="text-muted-foreground"> · offline</span>}
              </p>
            ) : (
              <Select value={host?.id} onValueChange={setChosenHost}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose a backend" />
                </SelectTrigger>
                <SelectContent>
                  {hosts.map((candidate) => (
                    <SelectItem key={candidate.id} value={candidate.id}>
                      <span className={cn(!candidate.agent.connected && "text-muted-foreground")}>
                        {candidate.agent.name}
                        {!candidate.agent.connected && " (offline)"}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </Section>
        </>
      )}

      <DialogFooter>
        <Button variant="outline" onClick={() => closeDialog()} disabled={busy}>
          {noDeployers ? "Close" : "Cancel"}
        </Button>
        {noDeployers ? null : approvals.length === 0 ? (
          <Button onClick={authorize}>
            <ShieldCheck />
            Authorize…
          </Button>
        ) : stranded ? (
          <Button onClick={authorize}>
            <ShieldCheck />
            Authorize another deployer…
          </Button>
        ) : (
          <Button onClick={deploy} disabled={busy || !host || !argKey}>
            <Rocket />
            {busy ? "Deploying…" : "Deploy"}
          </Button>
        )}
      </DialogFooter>
    </div>
  );
};
