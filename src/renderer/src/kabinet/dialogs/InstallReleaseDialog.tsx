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
import Timestamp from "@/core/ui/timestamp";
import { cn } from "@/core/util/utils";
import { type InstallerImplementationFragment, useApprovalInstallersQuery } from "@/rekuest/api/graphql";
import { CheckCircle2, Rocket, TriangleAlert } from "lucide-react";
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
import {
  deployerApps,
  EXPIRY_CHOICES,
  hostsOf,
  releaseRequirements,
  reusableApproval,
} from "../lib/approvals";

/** Takes the approval and nothing else it cannot do without. */
export const isApprovalInstaller = (installer: InstallerImplementationFragment) =>
  installer.action.args.slice(1).every((arg) => arg.nullable);

export const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="flex min-w-0 flex-col gap-1.5">
    <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</h4>
    {children}
  </section>
);

/**
 * Which deployer app may start the release as you. One is a line; several
 * are a choice, the ones with a connected host first.
 */
const DeployerChoice = ({
  apps,
  selected,
  onSelect,
}: {
  apps: string[];
  selected?: string;
  onSelect: (app: string) => void;
}) => {
  if (apps.length === 1 && selected) {
    return <p className="font-mono text-sm">{selected}</p>;
  }
  return (
    <Select value={selected} onValueChange={onSelect}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Choose a deployer" />
      </SelectTrigger>
      <SelectContent>
        {apps.map((app) => (
          <SelectItem key={app} value={app}>
            <span className="font-mono text-xs">{app}</span>
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

const ANY_HOST = "__any__";

/**
 * Install a release: authorize it, nothing more. A lok mandate lets the
 * chosen deployer app start it signed in as you, recorded as a kabinet
 * approval pinned to the release's digest. Nothing runs yet: deploying it to
 * a backend is its own step (`deployrelease`), offered once this is done.
 *
 * An active approval of yours for the same deployer app is reused, so the
 * dialog goes straight to deploying. A new version always needs a new
 * approval: the digest moves.
 */
export const InstallReleaseDialog = (props: { release: string; agent?: string }) => {
  const { closeDialog, openDialog } = useDialog();
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

  const installers = useMemo(
    () => (installersQuery.data?.implementations ?? []).filter(isApprovalInstaller),
    [installersQuery.data],
  );
  const apps = useMemo(() => deployerApps(installers), [installers]);

  const [chosenApp, setChosenApp] = useState<string | undefined>(props.agent);
  const agent = chosenApp && apps.includes(chosenApp) ? chosenApp : apps.at(0);
  const hosts = useMemo(() => (agent ? hostsOf(installers, agent) : []), [installers, agent]);

  // Optional: pin the mandate to one host's device. Default is any host of
  // the deployer app; the host is chosen when deploying.
  const [onlyHost, setOnlyHost] = useState<string>(ANY_HOST);
  const lockedHost = hosts.find((host) => host.id === onlyHost && host.agent.device);
  const [expiresInDays, setExpiresInDays] = useState<number | null>(null);
  const [maxClients, setMaxClients] = useState("");
  const [busy, setBusy] = useState(false);
  const [installed, setInstalled] = useState(false);

  const release = data?.release;
  const existing = release && agent ? reusableApproval(release.approvals, agent, self.userId) : undefined;

  const maxClientsValue = maxClients.trim() === "" ? null : Number(maxClients);
  const maxClientsInvalid = maxClientsValue !== null && (!Number.isInteger(maxClientsValue) || maxClientsValue < 1);

  const newApproval = async (target: ApprovableReleaseFragment, agentIdentifier: string): Promise<string> => {
    const mandate = await createMandate({
      agent: agentIdentifier,
      manifest: target.mandateManifest as JSONObject,
      attestation: target.approvalDigest,
      agentDeviceId: lockedHost?.agent.device?.deviceId ?? null,
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
    if (!release || !agent) return;
    setBusy(true);
    try {
      await newApproval(release, agent);
      setInstalled(true);
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  };

  const deploy = () =>
    openDialog("deployrelease", { release: props.release, agent }, { className: "max-w-xl" });

  if (error) {
    return <p className="text-sm text-destructive">Could not load the release: {error.message}</p>;
  }
  if (!release) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  const identity = releaseIdentity(release);
  const noDeployers = installersQuery.data && apps.length === 0;
  // After installing, the refetched release makes the new approval `existing`.
  const done = installed || existing;

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
              Installing authorizes it to run signed in as you, limited to what is listed here. It
              runs once you deploy it to a backend. Revoke the approval to sign it out.
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <Section title="Deployed by">
        {installersQuery.error ? (
          <p className="text-sm text-destructive">{installersQuery.error.message}</p>
        ) : noDeployers ? (
          <p className="text-sm text-muted-foreground">
            No deployer offers to install approved releases. Start a deployer that provides{" "}
            <span className="font-mono">install(approval)</span> first.
          </p>
        ) : (
          <DeployerChoice apps={apps} selected={agent} onSelect={setChosenApp} />
        )}
      </Section>

      {done ? (
        <p className="flex items-start gap-2 text-sm">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>
            {installed ? (
              <>Installed. {agent} may now start it as you.</>
            ) : (
              <>
                You installed this release for {existing?.agent}{" "}
                {existing && <Timestamp date={existing.createdAt} relative />}.
              </>
            )}{" "}
            Deploy it to a backend to run it.
          </span>
        </p>
      ) : (
        <>
          <Review release={release} />

          {agent && (
            <Section title="Limits">
              <div className="flex flex-col gap-3">
                {hosts.some((host) => host.agent.device) && (
                  <div className="flex items-center justify-between gap-3">
                    <Label className="font-normal">May be started on</Label>
                    <Select value={onlyHost} onValueChange={setOnlyHost}>
                      <SelectTrigger className="h-8 w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={ANY_HOST}>Any host</SelectItem>
                        {hosts
                          .filter((host) => host.agent.device)
                          .map((host) => (
                            <SelectItem key={host.id} value={host.id}>
                              Only {host.agent.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
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
        {done ? (
          <>
            <Button variant="outline" onClick={() => closeDialog()}>
              Done
            </Button>
            <Button onClick={deploy}>
              <Rocket />
              Deploy…
            </Button>
          </>
        ) : (
          <>
            <Button variant="outline" onClick={() => closeDialog()} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={busy || !agent || maxClientsInvalid}>
              {busy ? "Installing…" : "Install"}
            </Button>
          </>
        )}
      </DialogFooter>
    </div>
  );
};
