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
import { Download, Rocket } from "lucide-react";
import { useMemo, useState } from "react";
import { useGetApprovableReleaseQuery } from "../api/graphql";
import { releaseIdentity } from "../appIdentity";
import { AppIcon } from "../components/AppIcon";
import { deployableApprovals, hostsOf } from "../lib/approvals";
import { isApprovalInstaller, Section } from "./InstallReleaseDialog";

const APPROVAL_IDENTIFIER = "@kabinet/approval";

/**
 * Deploy an installed release: hand one of your approvals of it to a host of
 * the deployer it names, which runs its `install(approval)` and starts the
 * release there, signed in as you. Installing (`installrelease`) only
 * authorizes; this is the step that sends it to a backend. Without an
 * approval there is nothing to deploy under, so it offers to install first.
 */
export const DeployReleaseDialog = (props: { release: string; approval?: string; agent?: string }) => {
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

  const hosts = useMemo(
    () =>
      approval
        ? hostsOf((installersQuery.data?.implementations ?? []).filter(isApprovalInstaller), approval.agent)
        : [],
    [installersQuery.data, approval],
  );
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

      {approvals.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Install this release first: installing authorizes a deployer to start it as you.
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
          {approvals.length === 1 && approval && (
            <p className="text-sm text-muted-foreground">
              Installed for <span className="font-mono text-foreground">{approval.agent}</span>{" "}
              <Timestamp date={approval.createdAt} relative />.
            </p>
          )}

          <Section title="Backend">
            {installersQuery.error ? (
              <p className="text-sm text-destructive">{installersQuery.error.message}</p>
            ) : installersQuery.data && hosts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No host of <span className="font-mono">{approval?.agent}</span> is registered. Start one to
                deploy to it.
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
          Cancel
        </Button>
        {approvals.length === 0 ? (
          <Button
            onClick={() =>
              openDialog("installrelease", { release: props.release, agent: props.agent }, { className: "max-w-xl" })
            }
          >
            <Download />
            Install…
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
