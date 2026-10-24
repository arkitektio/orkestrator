import {
  BLUETOOTH_UNAVAILABLE_TEXT,
  BluetoothDevicePicker,
  connectGatt,
  useBluetoothAvailability,
  useBluetoothScan,
  type GattConnection,
} from "@/core/bluetooth";
import { Arkitekt } from "@/core/connection/arkitekt/host";
import { manifest as appManifest } from "@/core/constants";
import { PageLayout } from "@/core/layout/PageLayout";
import { StatusPage } from "@/core/layout/fallbacks/StatusPage";
import { LokMandate } from "@/core/linkers";
import { Badge } from "@/core/ui/badge";
import { Button } from "@/core/ui/button";
import { Input } from "@/core/ui/input";
import { Label } from "@/core/ui/label";
import { Progress } from "@/core/ui/progress";
import { Spinner } from "@/core/ui/spinner";
import { Switch } from "@/core/ui/switch";
import { cn } from "@/core/util/utils";
import { WifiProfileForm, useWifiProfiles, wifiProfileLabel, wifiProfileProblem } from "@/core/wifi";
import { BluetoothOff, Check, CircleAlert, Plus, Wifi } from "lucide-react";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import type { WifiProfile } from "../../../../main/wifi/protocol";
import {
  useCreateMandateMutation,
  useIssueChildMandateKeyMutation,
  useRevokeMandateMutation,
  useStandingMandatesLazyQuery,
} from "../api/graphql";
import { LOK_HELP } from "../help";
import { ProvisionError, runProvisioning, type ProvisionProgress } from "../provisioning/flow";
import { findStandingMandate } from "../provisioning/standing";
import {
  DEVICE_NAME_PREFIX,
  PROVISIONING_SERVICE,
  deploymentOrigin,
  openProvisioningDevice,
  statusText,
  type DeviceInfo,
  type ProvisioningDevice,
} from "../provisioning/protocol";

type Connected = { gatt: GattConnection; device: ProvisioningDevice; info: DeviceInfo; name: string | null };

const STEPS = ["Find", "Inspect", "Configure", "Provision"] as const;

const Steps = ({ current }: { current: number }) => (
  <ol className="flex flex-wrap items-center gap-2 text-sm">
    {STEPS.map((label, index) => (
      <li
        key={label}
        className={cn(
          "flex items-center gap-1.5",
          index === current ? "font-medium text-foreground" : "text-muted-foreground",
        )}
      >
        <span
          className={cn(
            "flex size-5 items-center justify-center rounded-full border text-xs",
            index < current && "border-primary bg-primary text-primary-foreground",
            index === current && "border-primary",
          )}
        >
          {index < current ? <Check className="size-3" /> : index + 1}
        </span>
        {label}
        {index < STEPS.length - 1 && <span className="ml-1 text-muted-foreground/50">—</span>}
      </li>
    ))}
  </ol>
);

const Fact = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex flex-col gap-0.5">
    <span className="text-[0.65rem] uppercase tracking-wider text-muted-foreground">{label}</span>
    <span className="text-sm">{children}</span>
  </div>
);

const DeviceFacts = ({ connected }: { connected: Connected }) => {
  const { manifest, build, has_key, has_wifi } = connected.info;
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Fact label="App">
          <span className="font-mono text-xs">{manifest.identifier}</span>
        </Fact>
        <Fact label="Version">
          <span className="font-mono text-xs">{manifest.version}</span>
        </Fact>
        <Fact label="Device id">
          <span className="font-mono text-xs">{manifest.device_id}</span>
        </Fact>
        <Fact label="Firmware build">
          <span className="font-mono text-xs">{build ?? "—"}</span>
        </Fact>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <Badge variant={has_wifi ? "secondary" : "outline"}>{has_wifi ? "Has Wi-Fi" : "No Wi-Fi yet"}</Badge>
        <Badge variant={has_key ? "secondary" : "outline"}>{has_key ? "Has a key (will be replaced)" : "No key yet"}</Badge>
      </div>
      {manifest.requirements.length > 0 && (
        <Fact label="Needs">
          <span className="flex flex-wrap gap-1.5">
            {manifest.requirements.map((r) => (
              <Badge key={r.key} variant="outline" className="font-mono text-xs">
                {r.key} · {r.service}
                {r.optional && " (optional)"}
              </Badge>
            ))}
          </span>
        </Fact>
      )}
      {manifest.scopes.length > 0 && (
        <Fact label="Scopes">
          <span className="font-mono text-xs">{manifest.scopes.join(", ")}</span>
        </Fact>
      )}
    </div>
  );
};

/** Choose a saved Wi-Fi profile, or write a new one. */
const WifiChooser = ({ value, onChange }: { value: WifiProfile | null; onChange: (p: WifiProfile | null) => void }) => {
  const { profiles, secretsPersisted, save, loading } = useWifiProfiles();
  const [editing, setEditing] = useState<WifiProfile | "new" | null>(null);

  const pick = (profile: WifiProfile) => {
    // A profile saved without its secrets (no keychain) needs them again.
    if (wifiProfileProblem(profile)) setEditing(profile);
    else onChange(profile);
  };

  if (editing) {
    return (
      <WifiProfileForm
        initial={editing === "new" ? undefined : editing}
        submitLabel="Save and use"
        onCancel={() => setEditing(null)}
        onSubmit={async (profile) => {
          await save(profile);
          onChange(profile);
          setEditing(null);
        }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {loading && <Spinner />}
      {profiles.map((profile) => (
        <button
          key={profile.id}
          type="button"
          onClick={() => pick(profile)}
          className={cn(
            "flex items-center gap-2 rounded-md border px-3 py-2 text-left text-sm hover:bg-muted",
            value?.id === profile.id && "border-primary bg-primary/5",
          )}
        >
          <Wifi className="size-4 text-muted-foreground" />
          <span className="truncate">{wifiProfileLabel(profile)}</span>
          <span className="ml-auto text-xs text-muted-foreground">{profile.type === "eduroam" ? "eduroam" : "WPA"}</span>
          {value?.id === profile.id && <Check className="size-4 text-primary" />}
        </button>
      ))}
      <Button variant="outline" size="sm" className="self-start" onClick={() => setEditing("new")}>
        <Plus className="size-3.5" />
        New Wi-Fi profile
      </Button>
      {!secretsPersisted && !loading && (
        <p className="text-xs text-muted-foreground">
          This computer offers no keychain, so passwords are not saved; you enter them each time.
        </p>
      )}
    </div>
  );
};

/**
 * Sets up an Arkitekt device over Bluetooth: find it, read what it is, give
 * it Wi-Fi, the deployment and a mandate key pinned to it, and follow it
 * until it registers. Keys are children of one standing mandate this app
 * holds per firmware app (`provisioning/standing.ts`), so the device acts as
 * you until its key or that mandate is revoked, or this app's sign-in ends.
 */
export const ProvisionDevicePage = () => {
  const { availability, recheck } = useBluetoothAvailability();
  const scan = useBluetoothScan();
  const [connecting, setConnecting] = useState<string | null>(null);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [connected, setConnected] = useState<Connected | null>(null);
  const [step, setStep] = useState(0);
  // `gatt.connected` is not React state; a drop re-renders the page to show it.
  const [, rerender] = useReducer((n: number) => n + 1, 0);

  const profile = Arkitekt.useActiveProfile();
  const [origin, setOrigin] = useState(() => {
    try {
      return profile?.identity.baseUrl ? deploymentOrigin(profile.identity.baseUrl) : "";
    } catch {
      return "";
    }
  });
  const [wifi, setWifi] = useState<WifiProfile | null>(null);
  /** Whether the device's key may ask lok for a mesh key (the parent mandate's `allowMesh`). */
  const [allowMesh, setAllowMesh] = useState(true);
  const [progress, setProgress] = useState<ProvisionProgress | null>(null);
  /** The mandate whose key this device already holds: a retry resends Wi-Fi only. */
  const [heldMandate, setHeldMandate] = useState<string | null>(null);

  const [loadMandates] = useStandingMandatesLazyQuery({ fetchPolicy: "network-only" });
  const [createMandate] = useCreateMandateMutation();
  const [issueChildMandateKey] = useIssueChildMandateKeyMutation();
  const [revokeMandate] = useRevokeMandateMutation();

  // Disconnect when the page goes away.
  const live = useRef<Connected | null>(null);
  live.current = connected;
  useEffect(() => () => void live.current?.gatt.disconnect().catch(() => undefined), []);

  const startScan = useCallback(
    () => scan.start({ services: [PROVISIONING_SERVICE], timeoutMs: 20_000 }),
    [scan.start],
  );

  const reset = async () => {
    await connected?.gatt.disconnect().catch(() => undefined);
    setConnected(null);
    setProgress(null);
    setHeldMandate(null);
    setConnectError(null);
    setStep(0);
  };

  const pick = async (id: string, name: string | null) => {
    setConnecting(id);
    setConnectError(null);
    let gatt: GattConnection | undefined;
    try {
      gatt = await connectGatt(id);
      const device = openProvisioningDevice(gatt);
      const info = await device.readInfo();
      gatt.onDisconnected(rerender);
      setConnected({ gatt, device, info, name });
      setStep(1);
    } catch (error) {
      await gatt?.disconnect().catch(() => undefined);
      setConnectError(error instanceof Error ? error.message : String(error));
    } finally {
      setConnecting(null);
    }
  };

  let originProblem: string | null = null;
  try {
    if (!origin) originProblem = "Enter the deployment's address";
    else if (deploymentOrigin(origin) !== origin) originProblem = `Only the origin: ${deploymentOrigin(origin)}`;
  } catch {
    originProblem = "Not a URL (https://host)";
  }
  const wifiProblem = wifi ? wifiProfileProblem(wifi) : "Choose a Wi-Fi profile";
  const ready = connected && wifi && !originProblem && !wifiProblem;

  const provision = async () => {
    if (!ready || !connected || !wifi) return;
    setStep(3);
    try {
      await runProvisioning({
        device: connected.device,
        info: connected.info,
        wifi,
        origin,
        existing: heldMandate ? { mandateId: heldMandate } : undefined,
        onDropped: connected.gatt.onDisconnected,
        onProgress: (p) => {
          setProgress(p);
          if (p.mandateId) setHeldMandate(p.mandateId);
        },
        issueKey: async ({ manifest }) => {
          // The standing mandate this app holds for the firmware, created on first use.
          const { data: live, error } = await loadMandates();
          if (error) throw error;
          let parentId = findStandingMandate(live?.mandates ?? [], appManifest.identifier, manifest.identifier, allowMesh)?.id;
          if (!parentId) {
            const { data } = await createMandate({
              variables: {
                input: {
                  agent: appManifest.identifier,
                  // Its scopes and requirements are the ceiling for every device key under it.
                  manifest: {
                    identifier: manifest.identifier,
                    version: manifest.version,
                    scopes: manifest.scopes,
                    requirements: manifest.requirements.map((r) => ({
                      key: r.key,
                      service: r.service,
                      optional: r.optional,
                      description: r.description ?? null,
                    })),
                  },
                  // As long as this app's sign-in lasts.
                  expiresInDays: null,
                  // Every device key under it inherits this.
                  allowMesh,
                },
              },
            });
            parentId = data?.createMandate.id;
            if (!parentId) throw new Error("lok created no mandate.");
          }
          // One key per device, pinned to the id the DEVICE reports (never the Bluetooth peripheral id).
          const { data } = await issueChildMandateKey({
            variables: {
              input: { mandate: parentId, deviceId: manifest.device_id, label: `${manifest.device_id} via Bluetooth` },
            },
          });
          if (!data?.issueChildMandateKey) throw new Error("lok issued no key.");
          return { key: data.issueChildMandateKey.key, mandateId: data.issueChildMandateKey.mandate.id };
        },
        revokeKey: async (id) => {
          await revokeMandate({ variables: { id } });
        },
      });
    } catch (error) {
      if (error instanceof ProvisionError) {
        if (error.mandateId) setHeldMandate(error.mandateId);
      } else {
        setProgress({ phase: "failed", error: error instanceof Error ? error.message : String(error) });
      }
    }
  };

  const unavailable = availability && !availability.available ? availability : null;

  return (
    <PageLayout title="Provision device" help={LOK_HELP.provisionDevice}>
      <div className="flex w-full flex-col gap-6 p-4 md:p-6">
        <header className="flex flex-col gap-3">
          <h1 className="text-2xl font-bold tracking-tight">Provision a device</h1>
          <p className="text-sm text-muted-foreground">
            Give an Arkitekt device (an ESP32 in pairing mode) its Wi-Fi and a key to sign in with. The device then acts as
            you, until you revoke its key under Mandates or this app's sign-in ends.
          </p>
          <Steps current={step} />
        </header>

        {availability === null && <Spinner />}

        {unavailable && (
          <StatusPage
            variant="compact"
            icon={BluetoothOff}
            tone="warning"
            eyebrow="Bluetooth"
            title={BLUETOOTH_UNAVAILABLE_TEXT[unavailable.reason].title}
            description={BLUETOOTH_UNAVAILABLE_TEXT[unavailable.reason].hint}
            technical={unavailable.detail ?? null}
            actions={
              <Button size="sm" variant="outline" onClick={recheck}>
                Check again
              </Button>
            }
          />
        )}

        {availability?.available && step === 0 && (
          <section className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              Power the device on. A new device waits in pairing mode; one that is already set up enters it when you hold
              BOOT for 5 seconds.
            </p>
            <BluetoothDevicePicker
              devices={scan.devices}
              scanning={scan.scanning}
              error={scan.error ?? connectError}
              connecting={connecting}
              onScan={() => void startScan()}
              onPick={(device) => void pick(device.id, device.name)}
              emptyHint={
                <>
                  No device found. Devices advertise as <span className="font-mono">{DEVICE_NAME_PREFIX}…</span> while in
                  pairing mode.
                </>
              }
            />
          </section>
        )}

        {connected && step === 1 && (
          <section className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold">{connected.name ?? connected.info.manifest.device_id}</h2>
            <DeviceFacts connected={connected} />
            <div className="flex gap-2">
              <Button onClick={() => setStep(2)} disabled={!connected.gatt.connected}>
                Continue
              </Button>
              <Button variant="ghost" onClick={() => void reset()}>
                Choose another device
              </Button>
            </div>
            {!connected.gatt.connected && (
              <p className="text-sm text-destructive">The device dropped the connection. Choose it again.</p>
            )}
          </section>
        )}

        {connected && step === 2 && (
          <section className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <Label>Wi-Fi</Label>
              <WifiChooser value={wifi} onChange={setWifi} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Deployment</Label>
              <Input value={origin} onChange={(e) => setOrigin(e.target.value.trim())} placeholder="https://go.arkitekt.live" />
              <p className={cn("text-xs", originProblem ? "text-destructive" : "text-muted-foreground")}>
                {originProblem ??
                  "The device must reach this address from its own Wi-Fi: localhost or a VPN-only address will not work."}
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <Switch id="provision-mesh" checked={allowMesh} onCheckedChange={setAllowMesh} disabled={!!heldMandate} />
                <Label htmlFor="provision-mesh">Let the device join the mesh</Label>
              </div>
              <p className="text-xs text-muted-foreground">
                Its key may then ask lok for a mesh key, so it can reach instances that the deployment serves only on its mesh.
              </p>
            </div>

            {heldMandate && (
              <p className="text-xs text-muted-foreground">
                The device already holds its key from the last attempt; this sends only the Wi-Fi and the deployment.
              </p>
            )}
            <div className="flex gap-2">
              <Button onClick={() => void provision()} disabled={!ready || !connected.gatt.connected}>
                Provision
              </Button>
              <Button variant="ghost" onClick={() => setStep(1)}>
                Back
              </Button>
            </div>
          </section>
        )}

        {step === 3 && progress && (
          <section className="flex flex-col gap-4">
            <ProvisionStatus progress={progress} />
            {(progress.phase === "done" || progress.phase === "failed") && (
              <div className="flex flex-wrap gap-2">
                {progress.mandateId && (
                  <Button variant="outline" asChild>
                    <LokMandate.DetailLink object={{ id: progress.mandateId }}>Open its mandate</LokMandate.DetailLink>
                  </Button>
                )}
                {progress.phase === "failed" && connected?.gatt.connected && (
                  <Button variant="outline" onClick={() => setStep(2)}>
                    Change settings and retry
                  </Button>
                )}
                <Button onClick={() => void reset()}>Provision another device</Button>
              </div>
            )}
          </section>
        )}
      </div>
    </PageLayout>
  );
};

const PHASE_TEXT: Record<ProvisionProgress["phase"], string> = {
  issuing: "Issuing a key for the device…",
  sending: "Sending the configuration…",
  waiting: "Waiting for the device…",
  done: "The device is registered.",
  failed: "Provisioning failed.",
};

const ProvisionStatus = ({ progress }: { progress: ProvisionProgress }) => {
  const busy = progress.phase !== "done" && progress.phase !== "failed";
  return (
    <div className="flex flex-col gap-3">
      <p className="flex items-center gap-2 font-medium">
        {busy && <Spinner />}
        {progress.phase === "done" && <Check className="size-4 text-emerald-600" />}
        {progress.phase === "failed" && <CircleAlert className="size-4 text-destructive" />}
        {PHASE_TEXT[progress.phase]}
      </p>
      {progress.phase === "sending" && <Progress value={(progress.sent ?? 0) * 100} />}
      {progress.status && (
        <p className="text-sm text-muted-foreground">
          Device: {statusText(progress.status)}
          {progress.status.detail && ` — ${progress.status.detail}`}
        </p>
      )}
      {progress.error && <p className="text-sm text-destructive">{progress.error}</p>}
    </div>
  );
};

export default ProvisionDevicePage;
