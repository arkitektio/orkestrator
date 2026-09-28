import { useSelf } from "@/core/connection/useSelf";
import { useDialog } from "@/core/dialogs/registry";
import { useOperation } from "@/core/modules/hooks/useOperation";
import { toast } from "@/core/notify";
import type { JSONObject } from "@/core/types";
import { Alert, AlertDescription } from "@/core/ui/alert";
import { Badge } from "@/core/ui/badge";
import { Button } from "@/core/ui/button";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/core/ui/dialog";
import { Input } from "@/core/ui/input";
import { Label } from "@/core/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/core/ui/select";
import { Switch } from "@/core/ui/switch";
import Timestamp from "@/core/ui/timestamp";
import { cn } from "@/core/util/utils";
import { buildAssignInput } from "@/rekuest/assign";
import { type InstallerImplementationFragment, useApprovalInstallersQuery } from "@/rekuest/api/graphql";
import { useAssign } from "@/rekuest/hooks/useAssign";
import { CheckCircle2, TriangleAlert } from "lucide-react";
import { useMemo, useState } from "react";
import {
  type ApprovableReleaseFragment,
  GetApprovableReleaseDocument,
  ListReleaseApprovalsDocument,
  useApproveReleaseMutation,
  useGetApprovableReleaseQuery,
} from "../api/graphql";
import { releaseIdentity } from "../appIdentity";
import { AppIcon } from "../components/AppIcon";
import { EXPIRY_CHOICES, releaseRequirements, reusableApproval } from "../lib/approvals";

const APPROVAL_IDENTIFIER = "@kabinet/approval";

type Phase = "idle" | "approving" | "installing";

/** Takes the approval and nothing else it cannot do without. */
const isApprovalInstaller = (installer: InstallerImplementationFragment) =>
  installer.action.args.slice(1).every((arg) => arg.nullable);

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="flex min-w-0 flex-col gap-1.5">
    <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</h4>
    {children}
  </section>
);

/**
 * The deployers that can install an approval. One is a line; several are a
 * choice, the connected ones first.
 */
const InstallerChoice = ({
  installers,
  selected,
  onSelect,
}: {
  installers: InstallerImplementationFragment[];
  selected?: InstallerImplementationFragment;
  onSelect: (id: string) => void;
}) => {
  if (installers.length === 1 && selected) {
    return (
      <p className="text-sm">
        On <span className="font-medium">{selected.agent.name}</span>
        <span className="text-muted-foreground"> · {selected.agent.app.identifier}</span>
      </p>
    );
  }
  return (
    <Select value={selected?.id} onValueChange={onSelect}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Choose where to install" />
      </SelectTrigger>
      <SelectContent>
        {installers.map((installer) => (
          <SelectItem key={installer.id} value={installer.id}>
            <span className={cn(!installer.agent.connected && "text-muted-foreground")}>
              {installer.agent.name}
              {!installer.agent.connected && " (offline)"}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

/**
 * What the approval hands over, for the user to read before saying yes: the
 * scopes the app signs in with, the services it reaches, the images that run.
 */
const Review = ({ release }: { release: ApprovableReleaseFragment }) => {
  const requirements = useMemo(() => releaseRequirements(release.flavours), [release.flavours]);
  const images = useMemo(
    () => [...new Set(release.flavours.map((flavour) => flavour.image.imageString))],
    [release.flavours],
  );

  return (
    <>
      <Section title="Signs in as you, allowed to">
        {release.scopes.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {release.scopes.map((scope) => (
              <Badge key={scope} variant="secondary" className="font-mono text-xs">
                {scope}
              </Badge>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No scopes beyond signing in.</p>
        )}
      </Section>

      {requirements.length > 0 && (
        <Section title="Uses">
          <ul className="flex flex-col gap-1 text-sm">
            {requirements.map((requirement) => (
              <li key={requirement.key} className="flex min-w-0 flex-col">
                <span className="break-all font-mono text-xs">
                  {requirement.service}
                  {requirement.optional && <span className="font-sans text-muted-foreground"> · optional</span>}
                </span>
                {requirement.description && (
                  <span className="text-xs text-muted-foreground">{requirement.description}</span>
                )}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {images.length > 0 && (
        <Section title={images.length === 1 ? "Runs the image" : "Runs one of the images"}>
          <ul className="flex flex-col gap-0.5">
            {images.map((image) => (
              <li key={image} className="break-all font-mono text-xs text-muted-foreground">
                {image}
              </li>
            ))}
          </ul>
          {!release.digestPinned && (
            <Alert className="mt-1">
              <TriangleAlert className="size-4" />
              <AlertDescription className="text-xs">
                {images.length === 1 ? "This image is" : "Some images are"} referenced by tag, not digest.
                A rebuild pushed under the same tag would run under this approval without asking again.
              </AlertDescription>
            </Alert>
          )}
        </Section>
      )}
    </>
  );
};

/**
 * Install a release: approve it (a lok mandate letting the chosen deployer
 * start it signed in as you, recorded as a kabinet approval pinned to the
 * release's digest), then run the deployer's `install(approval)`.
 *
 * An active approval of yours for the same deployer is reused, so installing
 * again (another host of the same deployer app, a pod that was removed) does
 * not ask twice. A new version always needs a new approval: the digest moves.
 */
export const InstallReleaseDialog = (props: { release: string; implementation?: string }) => {
  const { closeDialog } = useDialog();
  const self = useSelf();
  const { data, error } = useGetApprovableReleaseQuery({ variables: { id: props.release } });
  const installersQuery = useApprovalInstallersQuery();
  const createMandate = useOperation<{ id: string }>("lok.createMandate");
  const revokeMandate = useOperation("lok.revokeMandate");
  const [approve] = useApproveReleaseMutation({
    refetchQueries: [
      { query: GetApprovableReleaseDocument, variables: { id: props.release } },
      ListReleaseApprovalsDocument,
    ],
  });
  const { assign } = useAssign();

  const installers = useMemo(
    () =>
      (installersQuery.data?.implementations ?? []).filter(isApprovalInstaller).sort(
        (a, b) => Number(b.agent.connected) - Number(a.agent.connected),
      ),
    [installersQuery.data],
  );

  const [chosen, setChosen] = useState<string | undefined>(props.implementation);
  const installer = installers.find((candidate) => candidate.id === chosen) ?? installers.at(0);

  const [onlyThisDevice, setOnlyThisDevice] = useState(true);
  const [expiresInDays, setExpiresInDays] = useState<number | null>(null);
  const [maxClients, setMaxClients] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");

  const release = data?.release;
  const agent = installer?.agent.app.identifier;
  const existing = release && agent ? reusableApproval(release.approvals, agent, self.userId) : undefined;
  const device = installer?.agent.device;
  const argKey = installer?.action.args.at(0)?.key;

  const maxClientsValue = maxClients.trim() === "" ? null : Number(maxClients);
  const maxClientsInvalid = maxClientsValue !== null && (!Number.isInteger(maxClientsValue) || maxClientsValue < 1);

  const newApproval = async (target: ApprovableReleaseFragment, agentIdentifier: string): Promise<string> => {
    const mandate = await createMandate({
      agent: agentIdentifier,
      manifest: target.mandateManifest as JSONObject,
      attestation: target.approvalDigest,
      agentDeviceId: onlyThisDevice && device ? device.deviceId : null,
      maxClients: maxClientsValue,
      expiresInDays,
    });
    try {
      const result = await approve({
        variables: {
          input: {
            release: target.id,
            mandate: mandate.id,
            agent: agentIdentifier,
            digest: target.approvalDigest,
          },
        },
      });
      const id = result.data?.approveRelease.id;
      if (!id) throw new Error("Kabinet did not record the approval");
      return id;
    } catch (cause) {
      // A mandate with no approval is a standing grant nothing tracks: take
      // it back rather than leave it live in lok.
      await revokeMandate({ id: mandate.id }).catch(() => undefined);
      throw cause;
    }
  };

  const submit = async () => {
    if (!release || !installer || !agent || !argKey) return;
    let approvalId = existing?.id;
    try {
      if (!approvalId) {
        setPhase("approving");
        approvalId = await newApproval(release, agent);
      }
      setPhase("installing");
      await assign({
        ...buildAssignInput({
          args: { [argKey]: { object: approvalId, __identifier: APPROVAL_IDENTIFIER } },
        }),
        implementation: installer.id,
      });
      toast.success(`Installing ${release.name} on ${installer.agent.name}`);
      closeDialog();
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      // Past the approval, the next try reuses it (the refetch above makes it
      // `existing`), so say which half failed.
      toast.error(approvalId ? `Approved, but the install did not start: ${message}` : message);
    } finally {
      setPhase("idle");
    }
  };

  if (error) {
    return <p className="text-sm text-destructive">Could not load the release: {error.message}</p>;
  }
  if (!release) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  const identity = releaseIdentity(release);
  const noInstallers = installersQuery.data && installers.length === 0;
  const busy = phase !== "idle";

  return (
    // `min-w-0`: DialogContent is a grid, whose items otherwise grow to their
    // longest unbreakable line (an image reference) past the dialog's edge.
    <div className="flex min-w-0 flex-col gap-5">
      <DialogHeader>
        <div className="flex items-center gap-3">
          <AppIcon app={identity} size={40} className="size-10" />
          <div className="min-w-0">
            <DialogTitle>
              Install {identity.name} <span className="font-mono text-base text-muted-foreground">v{release.version}</span>
            </DialogTitle>
            <DialogDescription className="mt-1 text-sm font-light">
              It runs signed in as you, limited to what is listed here. Revoke the approval to sign it
              out.
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <Section title="Where">
        {installersQuery.error ? (
          <p className="text-sm text-destructive">{installersQuery.error.message}</p>
        ) : noInstallers ? (
          <p className="text-sm text-muted-foreground">
            No deployer offers to install approved releases. Start a deployer that provides{" "}
            <span className="font-mono">install(approval)</span> first.
          </p>
        ) : (
          <InstallerChoice installers={installers} selected={installer} onSelect={setChosen} />
        )}
      </Section>

      {existing ? (
        <p className="flex items-start gap-2 text-sm">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>
            You approved this release for {existing.agent} <Timestamp date={existing.createdAt} relative />.
            Installing reuses that approval.
          </span>
        </p>
      ) : (
        <>
          <Review release={release} />

          {installer && (
            <Section title="Limits">
              <div className="flex flex-col gap-3">
                {device && (
                  <div className="flex items-center justify-between gap-3">
                    <Label htmlFor="install-only-device" className="font-normal">
                      Only {installer.agent.name} may start it
                    </Label>
                    <Switch id="install-only-device" checked={onlyThisDevice} onCheckedChange={setOnlyThisDevice} />
                  </div>
                )}
                <div className="flex items-center justify-between gap-3">
                  <Label className="font-normal">New instances may start</Label>
                  <Select
                    value={String(expiresInDays)}
                    onValueChange={(value) => setExpiresInDays(value === "null" ? null : Number(value))}
                  >
                    <SelectTrigger className="h-8 w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EXPIRY_CHOICES.map((choice) => (
                        <SelectItem key={String(choice.days)} value={String(choice.days)}>
                          {choice.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="install-max-clients" className="font-normal">
                    At most this many at once
                  </Label>
                  <Input
                    id="install-max-clients"
                    inputMode="numeric"
                    placeholder="No limit"
                    value={maxClients}
                    onChange={(event) => setMaxClients(event.target.value)}
                    className={cn("h-8 w-40", maxClientsInvalid && "border-destructive")}
                  />
                </div>
              </div>
            </Section>
          )}
        </>
      )}

      <DialogFooter>
        <Button variant="outline" onClick={() => closeDialog()} disabled={busy}>
          Cancel
        </Button>
        <Button onClick={submit} disabled={busy || !installer || !argKey || maxClientsInvalid}>
          {phase === "approving"
            ? "Approving…"
            : phase === "installing"
              ? "Starting install…"
              : existing
                ? "Install"
                : "Approve and install"}
        </Button>
      </DialogFooter>
    </div>
  );
};
