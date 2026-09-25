import type {
  MeshProbeResult,
  NetworkProbeResult,
  ProbeTarget,
} from "../../../../../../main/doctor/protocol";
import { controlDomain, type MeshPeer, type MeshSnapshot, type MeshStatusPayload } from "../../../../../../main/mesh/protocol";
import { classifyHost, isMeshClass } from "./classify";
import type { DiagnoseInput, Finding } from "./findings";
import { rankFindings } from "./findings";
import type { HubHealthFacts } from "./hubHealth";
import { HUB_VERDICT_TEXT, compareService } from "./hubHealth";
import { matchPeer, tailnetMismatch } from "./meshMatch";
import { failureLine } from "./stages";
import { isUpstream } from "./targets";

/**
 * Probe results in, sentences out. Pure: no network, no Electron, no clock.
 *
 * Every judgement the doctor makes lives here, which is why main is kept
 * decision-free — the whole diagnosis is testable from fixtures.
 *
 * The ordering matters as much as the rules. A user whose laptop is signed out
 * of Tailscale would otherwise be shown six identical connection timeouts
 * above the one sentence that explains all of them, so mesh causes are found
 * first and their symptoms are demoted (see `demoteSymptoms`).
 */

const TAILSCALE_DOWNLOAD = "https://tailscale.com/download";
const MESH_SETTINGS = "/settings/mesh";
const ARKITEKT_DOCS = "https://arkitekt.live/docs/introduction/basics";

const targetsOf = (input: DiagnoseInput): ProbeTarget[] => input.targets;

const meshTargets = (targets: ProbeTarget[]): ProbeTarget[] =>
  targets.filter((target) => isMeshClass(classifyHost(target.host)));

const labelOf = (target: ProbeTarget): string => target.label || target.host;

/**
 * The targets the BUILT-IN mesh is responsible for: mesh-shaped addresses,
 * plus anything under the deployment's mesh control domain — which the
 * sidecar routes with no pinning (`pac.ts` rule 5) even though the name
 * itself looks public — plus anything a running mesh already covers.
 */
const builtInMeshTargets = (input: DiagnoseInput, targets: ProbeTarget[]): ProbeTarget[] => {
  const domain = typeof input.context.meshCoordUrl === "string" ? controlDomain(input.context.meshCoordUrl) : undefined;
  return targets.filter((target) => {
    const shape = classifyHost(target.host).class;
    return (
      // A bare single label is usually a docker/LAN name; it is only the
      // mesh's business when a running mesh actually routes it.
      (isMeshClass(classifyHost(target.host)) && shape !== "mesh-bare") ||
      (!!domain && norm(target.host).endsWith(`.${domain}`)) ||
      !!coveringMesh(input.sidecar, target.host)
    );
  });
};

/* ───────────────────────── built-in mesh (sidecar) ────────────────────── */

const norm = (host: string): string => host.trim().toLowerCase().replace(/\.$/, "");

const sameOrigin = (a?: string | null, b?: string | null): boolean => {
  if (!a || !b) return false;
  try {
    return new URL(a).origin === new URL(b).origin;
  } catch {
    return false;
  }
};

/** The peer a host names, if the mesh knows one. */
export const peerFor = (mesh: MeshSnapshot, rawHost: string): MeshPeer | undefined => {
  const host = norm(rawHost);
  return (mesh.status.peers ?? []).find(
    (peer) =>
      (peer.dnsName && norm(peer.dnsName) === host) ||
      (peer.hostName && norm(peer.hostName) === host) ||
      peer.ips.includes(host),
  );
};

/** Does this running mesh route the host? Mirrors `src/main/mesh/pac.ts`. */
const meshCovers = (mesh: MeshSnapshot, rawHost: string): boolean => {
  if (mesh.status.state !== "running") return false;
  const host = norm(rawHost);
  if (mesh.config.hosts.map(norm).includes(host)) return true;
  const suffix = mesh.status.magicDnsSuffix ? norm(mesh.status.magicDnsSuffix) : undefined;
  if (suffix && (host === suffix || host.endsWith(`.${suffix}`))) return true;
  return !!peerFor(mesh, host);
};

/**
 * The running mesh that routes a host. The precise rules first; then the
 * control server's domain (`pac.ts` rule 5), which only counts when exactly
 * one running mesh claims it — two meshes on one control server tell their
 * hosts apart by suffix, not by domain.
 */
export const coveringMesh = (sidecar: MeshStatusPayload | undefined, rawHost: string): MeshSnapshot | undefined => {
  const exact = sidecar?.meshes.find((mesh) => meshCovers(mesh, rawHost));
  if (exact || !sidecar) return exact;
  const host = norm(rawHost);
  const byDomain = sidecar.meshes.filter((mesh) => {
    if (mesh.status.state !== "running") return false;
    const domain = controlDomain(mesh.config.controlUrl);
    return !!domain && host.endsWith(`.${domain}`);
  });
  return byDomain.length === 1 ? byDomain[0] : undefined;
};

/** The meshes that belong to the deployment being diagnosed. */
export const deploymentMeshes = (input: DiagnoseInput, sidecar: MeshStatusPayload): MeshSnapshot[] =>
  sidecar.meshes.filter(
    (mesh) =>
      mesh.config.id === input.context.profileMesh?.id ||
      sameOrigin(mesh.config.controlUrl, input.context.meshCoordUrl),
  );

const SIGN_IN_AGAIN = "Sign out of this deployment and sign in again.";

/**
 * The app's own mesh node, one verdict per way it can be wrong. Membership
 * comes with the login and nothing else, so every remedy here is either
 * "sign in again", "ask an administrator" or "pin the address" — never a
 * sign-in flow of the mesh's own. Only raised for mesh-looking addresses.
 */
const sidecarFindings = (input: DiagnoseInput, targets: ProbeTarget[]): Finding[] => {
  const sidecar = input.sidecar;
  if (!sidecar) return [];
  const relevant = builtInMeshTargets(input, targets);
  if (relevant.length === 0) return [];

  const findings: Finding[] = [];
  const hosts = relevant.map((target) => target.host);
  const covered = relevant.filter((target) => coveringMesh(sidecar, target.host));
  const uncovered = relevant.filter((target) => !coveringMesh(sidecar, target.host));

  // ── switched off by the user: nothing runs, and nothing else is wrong ──
  if (input.context.profileMesh?.enabled === false) {
    findings.push({
      id: "mesh.sidecar.disabled",
      severity: "blocker",
      title: "This profile's mesh is switched off",
      detail:
        "The addresses below are on a private mesh, and the mesh of the profile " +
        "you are signed in to is turned off, so nothing routes to them.",
      evidence: hosts,
      remedy: { kind: "navigate", label: "Open mesh settings", path: MESH_SETTINGS },
    });
    return findings;
  }

  // ── the client itself ──
  if (sidecar.sidecar.state === "unavailable") {
    findings.push({
      id: "mesh.sidecar.unavailable",
      severity: "blocker",
      title:
        sidecar.sidecar.reason === "binary-missing"
          ? "This build of Orkestrator has no mesh client"
          : "Orkestrator's mesh client could not be started",
      detail:
        (sidecar.sidecar.reason === "binary-missing"
          ? "The addresses below are on a private mesh, and this build ships without " +
            "the built-in client that joins one, so they cannot be reached from it."
          : "The addresses below are on a private mesh, and the built-in client that " +
            "joins one failed to start on this computer.") +
        (sidecar.sidecar.detail ? ` (${sidecar.sidecar.detail})` : ""),
      evidence: hosts,
    });
    return findings;
  }

  // ── addresses the mesh routes: the probes went through it ──
  for (const target of covered) {
    const mesh = coveringMesh(sidecar, target.host)!;
    const peer = peerFor(mesh, target.host);
    const label = labelOf(target);
    if (peer && peer.expired) {
      findings.push({
        id: "mesh.sidecar.peer-expired",
        severity: "blocker",
        title: `The machine behind ${target.host} has dropped off the ${mesh.config.label} mesh`,
        detail:
          "Its key has expired, so the mesh no longer carries traffic to it. " +
          "Whoever runs that machine has to sign it in to the mesh again.",
        evidence: [`peer: ${peer.dnsName ?? peer.hostName ?? target.host}`, `mesh: ${mesh.config.controlUrl}`],
        targetLabel: label,
      });
    } else if (peer && !peer.online) {
      findings.push({
        id: "mesh.sidecar.peer-offline",
        severity: "blocker",
        title: `The machine behind ${target.host} is offline on the ${mesh.config.label} mesh`,
        detail:
          "This computer is on the mesh and the address is known there, but the " +
          "machine it names is not connected right now — switched off, asleep, or " +
          "its own mesh client stopped. Nothing on this computer can fix that.",
        evidence: [`peer: ${peer.dnsName ?? peer.hostName ?? target.host}`, `mesh: ${mesh.config.controlUrl}`],
        targetLabel: label,
      });
    }
  }
  if (covered.length > 0) {
    const names = [...new Set(covered.map((target) => coveringMesh(sidecar, target.host)!.config.label))];
    findings.push({
      id: "mesh.sidecar.routed",
      severity: "info",
      title: `Checked through the ${names.join(", ")} mesh`,
      detail:
        "Orkestrator routes these addresses through its own mesh client, and the " +
        "checks below went the same way, so they describe the machine on the mesh " +
        "and the service on it — not this computer's DNS or the system Tailscale app.",
      evidence: covered.map((target) => {
        const peer = peerFor(coveringMesh(sidecar, target.host)!, target.host);
        return `${labelOf(target)}: ${target.host}${peer ? ` → ${peer.dnsName ?? peer.hostName} (${peer.online ? "online" : "offline"})` : ""}`;
      }),
    });
  }

  if (uncovered.length === 0) return findings;

  // ── addresses nothing routes: why not, exactly ──
  const ours = deploymentMeshes(input, sidecar);
  const uncoveredHosts = uncovered.map((target) => target.host);

  for (const mesh of ours) {
    const { config, status } = mesh;
    const where = [`mesh: ${config.controlUrl}`, ...uncoveredHosts];
    switch (status.state) {
      case "needs-login":
        findings.push({
          id: "mesh.sidecar.needs-login",
          severity: "blocker",
          title: `This computer is no longer a member of the ${config.label} mesh`,
          detail:
            "Its membership expired or was revoked. Membership is granted when you " +
            "sign in to the deployment, so signing in again — and being allowed the " +
            "mesh — is what restores it.",
          evidence: where,
          remedy: { kind: "manual", instructions: SIGN_IN_AGAIN },
        });
        break;
      case "needs-machine-auth":
        findings.push({
          id: "mesh.sidecar.needs-machine-auth",
          severity: "blocker",
          title: `The ${config.label} mesh is waiting for an administrator to approve this computer`,
          detail:
            "This computer has joined, but the mesh requires administrators to " +
            "approve new machines before they can reach anything. Until then its " +
            "addresses stay unreachable.",
          evidence: where,
          remedy: { kind: "manual", instructions: "Ask an administrator of the deployment to approve this computer." },
        });
        break;
      case "error":
        findings.push({
          id: "mesh.sidecar.error",
          severity: "blocker",
          title: `The ${config.label} mesh could not be joined`,
          detail:
            "Orkestrator's mesh client reported an error for this mesh, so nothing " +
            "is routed through it. Signing in again retries the join with a fresh key.",
          evidence: [status.error ?? "unknown error", ...where],
          remedy: { kind: "manual", instructions: SIGN_IN_AGAIN },
        });
        break;
      case "starting":
        findings.push({
          id: "mesh.sidecar.starting",
          severity: "warning",
          title: `The ${config.label} mesh is still connecting`,
          detail:
            "Its addresses are not reachable until the node is up; that usually takes " +
            "a few seconds. Run the checks again.",
          evidence: where,
        });
        break;
      case "stopped":
        findings.push({
          id: "mesh.sidecar.stopped",
          severity: "blocker",
          title: `The ${config.label} mesh is not running`,
          detail:
            sidecar.sidecar.state === "crashed"
              ? `Orkestrator's mesh client stopped unexpectedly (${sidecar.sidecar.detail}), taking this mesh down with it.`
              : "This computer is a member, but its node for this mesh is not up right now.",
          evidence: where,
          remedy: { kind: "manual", instructions: "Restart Orkestrator; if it happens again, sign out and back in." },
        });
        break;
      case "running": {
        const peers = (status.peers ?? []).map((peer) => peer.dnsName ?? peer.hostName ?? peer.ips[0]).filter(Boolean);
        findings.push({
          id: "mesh.sidecar.host-not-routed",
          severity: "blocker",
          title: `The ${config.label} mesh is up, but ${uncoveredHosts[0]} is not on it`,
          detail:
            "This computer is connected to the mesh, yet this address is neither " +
            `under its name space${status.magicDnsSuffix ? ` (${status.magicDnsSuffix})` : ""}, ` +
            "nor one of its machines, nor pinned to it. Either the deployment " +
            "advertises an address the mesh does not know, or it belongs to a " +
            "different mesh. Pinning the deployment's addresses to this mesh " +
            "routes them anyway.",
          evidence: [
            ...uncoveredHosts.map((host) => `not routed: ${host}`),
            `mesh machines: ${peers.length > 0 ? peers.join(", ") : "none"}`,
            ...(config.hosts.length > 0 ? [`pinned: ${config.hosts.join(", ")}`] : []),
          ],
          remedy: { kind: "navigate", label: "Open mesh settings", path: MESH_SETTINGS },
        });
        break;
      }
    }
  }

  if (ours.length > 0) return findings;

  // No mesh of ours at all for this deployment. If the system Tailscale app
  // covers it, the system-client rules have the floor.
  const systemMeshUp = input.mesh?.available && input.mesh.backendState === "Running";
  if (systemMeshUp) return findings;

  const meshCoordUrl = input.context.meshCoordUrl;
  if (meshCoordUrl === null) {
    findings.push({
      id: "mesh.sidecar.not-advertised",
      severity: "blocker",
      title: "This deployment uses private mesh addresses but does not say which mesh",
      detail:
        `The address ${uncoveredHosts[0]} is a private mesh address, yet the deployment's ` +
        "discovery document names no mesh control server, so Orkestrator has no " +
        "way to join it. Whoever runs the deployment has to advertise its mesh " +
        "(the mesh_coord_url in .well-known/fakts).",
      evidence: uncoveredHosts,
      docs: ARKITEKT_DOCS,
    });
  } else if (meshCoordUrl) {
    findings.push({
      id: "mesh.sidecar.not-granted",
      severity: "blocker",
      title: "This computer was not let into the deployment's mesh when you signed in",
      detail:
        `The deployment runs on a private mesh at ${meshCoordUrl}. Orkestrator asks to ` +
        "join it with every sign-in; this time no membership came back — the " +
        "approver declined it, or the deployment could not issue one. Signing in " +
        "again asks once more; if it keeps being declined, ask an administrator.",
      evidence: [`mesh: ${meshCoordUrl}`, ...uncoveredHosts],
      remedy: { kind: "manual", instructions: SIGN_IN_AGAIN },
      docs: ARKITEKT_DOCS,
    });
  } else {
    findings.push({
      id: "mesh.sidecar.not-joined",
      severity: "blocker",
      title: "This deployment is on a private mesh this computer has not joined",
      detail:
        `The address ${uncoveredHosts[0]} lives on a private mesh. Orkestrator joins a ` +
        "deployment's mesh by itself when you sign in and the deployment allows " +
        "it — this login did not include that.",
      evidence: uncoveredHosts,
      remedy: { kind: "manual", instructions: SIGN_IN_AGAIN },
      docs: ARKITEKT_DOCS,
    });
  }

  return findings;
};

/* ────────────────────────────── mesh rules ────────────────────────────── */

/**
 * Everything we can say about the tailnet. Only ever raised when at least one
 * alias actually looks like a mesh address — telling somebody connecting to
 * `go.arkitekt.live` that Tailscale is not installed is noise.
 */
const meshFindings = (
  mesh: MeshProbeResult | undefined,
  targets: ProbeTarget[],
): Finding[] => {
  const relevant = meshTargets(targets);
  if (relevant.length === 0 || !mesh) return [];

  const findings: Finding[] = [];
  const hosts = relevant.map((target) => target.host);

  if (!mesh.available) {
    if (mesh.reason === "cli-not-found") {
      findings.push({
        id: "mesh.cli-missing",
        severity: "blocker",
        title: "This deployment is only reachable over a Tailscale network",
        detail:
          `The address ${hosts[0]} is a Tailscale address, but no Tailscale ` +
          "command line tool was found on this computer, so there is no way to " +
          "check or join the network. If Tailscale is installed from the Mac " +
          "App Store it ships without the command line tool — the app itself " +
          "still works, it just cannot be inspected from here.",
        evidence: hosts,
        remedy: { kind: "open-url", label: "Get Tailscale", url: TAILSCALE_DOWNLOAD },
        docs: ARKITEKT_DOCS,
      });
    } else {
      findings.push({
        id: "mesh.cli-failed",
        severity: "warning",
        title: "Tailscale is installed but did not answer",
        detail:
          "Tailscale is on this computer, but asking it for its status failed, " +
          "so the network side of this could not be checked.",
        evidence: mesh.detail ? [mesh.detail] : undefined,
      });
    }
    return findings;
  }

  const state = mesh.backendState;

  if (state === "NeedsLogin") {
    findings.push({
      id: "mesh.needs-login",
      severity: "blocker",
      title: "You are signed out of Tailscale",
      detail:
        `This deployment is reached over a Tailscale network, and this computer ` +
        "is not signed in to one. Signing in should make every address below " +
        "reachable again.",
      evidence: [`backend state: ${state}`, ...hosts],
      remedy: {
        kind: "run",
        label: "Sign in to Tailscale",
        id: "tailscale.up",
        confirm: "tailscale up",
      },
    });
  } else if (state === "Stopped" || state === "NoState") {
    findings.push({
      id: "mesh.not-running",
      severity: "blocker",
      title: "Tailscale is not running",
      detail:
        "This deployment is reached over a Tailscale network, and Tailscale is " +
        "switched off on this computer.",
      evidence: [`backend state: ${state}`, ...hosts],
      remedy: {
        kind: "run",
        label: "Start Tailscale",
        id: "tailscale.up",
        confirm: "tailscale up",
      },
    });
  }

  // Per-host: wrong tailnet, unknown machine, offline machine, expired key.
  for (const target of relevant) {
    const host = target.host;
    const label = labelOf(target);

    const mismatch = tailnetMismatch(host, mesh);
    if (mismatch) {
      findings.push({
        id: "mesh.wrong-tailnet",
        severity: "blocker",
        title: "You are connected to a different tailnet",
        detail:
          `${host} belongs to the tailnet ${mismatch.host}, but this computer is ` +
          `signed in to ${mismatch.expected}. A machine in one tailnet cannot see ` +
          "a machine in another, so nothing here will connect until you switch.",
        evidence: [`alias tailnet: ${mismatch.host}`, `signed in to: ${mismatch.expected}`],
        remedy: {
          kind: "manual",
          instructions:
            "Sign in to the tailnet that hosts this deployment, or ask its " +
            "administrator to invite this account to it.",
        },
        targetLabel: label,
      });
      continue;
    }

    if (state !== "Running") continue;

    const peer = matchPeer(host, mesh);
    if (!peer) {
      findings.push({
        id: "mesh.peer-unknown",
        severity: "blocker",
        title: `No machine called ${host} in your tailnet`,
        detail:
          "You are signed in to Tailscale, but this tailnet holds no machine " +
          "under that name. Either the machine has left the network, or this " +
          "deployment lives in a different tailnet.",
        evidence: [`signed in to: ${mesh.magicDnsSuffix ?? mesh.tailnetName ?? "unknown"}`],
        targetLabel: label,
      });
      continue;
    }

    if (peer.expired) {
      findings.push({
        id: "mesh.peer-key-expired",
        severity: "blocker",
        title: `The machine hosting ${host} has an expired Tailscale key`,
        detail:
          "The machine is in your tailnet but its key has expired, so it can no " +
          "longer be reached. Somebody has to re-authenticate it, or disable key " +
          "expiry for it in the Tailscale admin console.",
        evidence: [peer.keyExpiry ? `key expired: ${peer.keyExpiry}` : "key expired"],
        remedy: {
          kind: "open-url",
          label: "Open the Tailscale admin console",
          url: "https://login.tailscale.com/admin/machines",
        },
        targetLabel: label,
      });
      continue;
    }

    if (peer.online === false) {
      findings.push({
        id: "mesh.peer-offline",
        severity: "blocker",
        title: `The machine hosting ${host} is offline`,
        detail:
          "The machine is part of your tailnet but is not currently connected, " +
          "so nothing on it can answer. This is a problem on that machine, not " +
          "on this one.",
        evidence: [
          peer.lastSeen ? `last seen: ${peer.lastSeen}` : "not connected",
          ...peer.ips,
        ],
        remedy: {
          kind: "manual",
          instructions:
            "Wake or restart the machine that hosts this deployment, or ask its " +
            "administrator to.",
        },
        targetLabel: label,
      });
    }
  }

  return findings;
};

/**
 * Tailscale is up, the machine is there — said once, so the report never comes
 * back looking empty and the user knows where to point the finger next.
 */
const meshHealthy = (
  mesh: MeshProbeResult | undefined,
  targets: ProbeTarget[],
  findings: Finding[],
): Finding[] => {
  const relevant = meshTargets(targets);
  if (relevant.length === 0 || !mesh || !mesh.available) return [];
  if (mesh.backendState !== "Running") return [];
  if (findings.some((finding) => finding.id.startsWith("mesh."))) return [];

  return [
    {
      id: "mesh.healthy",
      severity: "info",
      title: "Your Tailscale connection looks healthy",
      detail:
        `This computer is signed in to ${mesh.magicDnsSuffix ?? mesh.tailnetName ?? "a tailnet"} ` +
        "and the machines behind these addresses are online, so the network is " +
        "not what is blocking this.",
    },
  ];
};

/* ──────────────────────────── network rules ───────────────────────────── */

const dnsFindings = (
  probe: NetworkProbeResult,
  mesh: MeshProbeResult | undefined,
): Finding[] => {
  const { dns } = probe;
  const label = labelOf(probe.target);
  const host = probe.target.host;
  if (dns.skipped) return [];

  const lookupOk = dns.lookupAddresses.length > 0;
  const resolveOk = dns.resolveAddresses.length > 0;

  if (!lookupOk && !resolveOk) {
    return [
      {
        id: "net.dns.nxdomain",
        severity: "blocker",
        title: `${host} does not resolve to an address`,
        detail:
          "Neither this computer's resolver nor the public DNS servers know " +
          "this name. Either it is misspelled in the deployment's configuration, " +
          "or it only exists inside a private network this computer is not on.",
        evidence: [
          probe.url,
          dns.lookupError ? `lookup: ${dns.lookupError}` : "lookup: no addresses",
          dns.resolveError ? `resolve: ${dns.resolveError}` : "resolve: no addresses",
        ],
        targetLabel: label,
      },
    ];
  }

  // The interesting asymmetry: the OS knows it, public DNS does not. That is
  // MagicDNS doing its job — reported as reassurance, not as a problem.
  if (lookupOk && !resolveOk) {
    return [
      {
        id: "net.dns.magicdns-only",
        severity: "info",
        title: `${host} is a private name resolved by Tailscale`,
        detail:
          "This computer resolves the name but public DNS does not, which is " +
          "what a MagicDNS name looks like. The name itself is fine.",
        evidence: [`resolves to ${dns.lookupAddresses.join(", ")}`],
        targetLabel: label,
      },
    ];
  }

  // The reverse: public DNS knows it, the OS does not. The resolver is not
  // picking up Tailscale's DNS, which is a real and fixable misconfiguration.
  if (!lookupOk && resolveOk) {
    const onMesh = mesh?.available && mesh.backendState === "Running";
    return [
      {
        id: "net.dns.os-resolver-bypassed",
        severity: onMesh ? "blocker" : "warning",
        title: `This computer cannot resolve ${host}, although public DNS can`,
        detail: onMesh
          ? "Tailscale is running, but this computer's DNS settings are not using " +
            "it, so private names do not resolve. Turning on 'Use Tailscale DNS' " +
            "(`tailscale up --accept-dns`) usually fixes this."
          : "The name exists publicly but this computer's resolver will not " +
            "return it, which usually means a VPN or a DNS override is in the way.",
        evidence: [
          dns.lookupError ? `lookup: ${dns.lookupError}` : "lookup: no addresses",
          `public DNS: ${dns.resolveAddresses.join(", ")}`,
        ],
        remedy: onMesh
          ? { kind: "copy", label: "Copy the command", value: "tailscale up --accept-dns" }
          : undefined,
        targetLabel: label,
      },
    ];
  }

  return [];
};

const tcpFindings = (probe: NetworkProbeResult): Finding[] => {
  const { tcp } = probe;
  const label = labelOf(probe.target);
  const host = probe.target.host;
  if (!tcp.attempted || tcp.ok) return [];

  const port = probe.target.port ?? (probe.target.ssl ? 443 : 80);

  if (tcp.code === "ECONNREFUSED") {
    return [
      {
        id: "net.tcp.refused",
        severity: "blocker",
        title: `${host} is reachable, but nothing is listening on port ${port}`,
        detail:
          "The machine answered and actively refused the connection, which means " +
          "the network is fine and the service itself is not running — or is " +
          "running on a different port than the deployment advertises.",
        evidence: [probe.url, `ECONNREFUSED after ${tcp.ms}ms`],
        remedy: { kind: "copy", label: "Copy the address", value: probe.url },
        targetLabel: label,
      },
    ];
  }

  if (tcp.code === "ETIMEDOUT" || tcp.code === "DOCTOR_TIMEOUT") {
    return [
      {
        id: "net.tcp.timeout",
        severity: "blocker",
        title: `${host} did not answer on port ${port}`,
        detail:
          "The connection was neither accepted nor refused, it was simply " +
          "ignored. That is what a firewall dropping traffic looks like, or a " +
          "machine that is not on this network at all.",
        evidence: [probe.url, `no answer after ${tcp.ms}ms`],
        targetLabel: label,
      },
    ];
  }

  if (tcp.code === "EHOSTUNREACH" || tcp.code === "ENETUNREACH") {
    return [
      {
        id: "net.tcp.unreachable",
        severity: "blocker",
        title: `There is no network route to ${host}`,
        detail:
          "This computer has no way to send traffic to that address at all — " +
          "typically a VPN that is switched off, or a network that has to be " +
          "joined first.",
        evidence: [probe.url, tcp.code],
        targetLabel: label,
      },
    ];
  }

  return [
    {
      id: "net.tcp.failed",
      severity: "blocker",
      title: `Could not open a connection to ${host}:${port}`,
      detail: "The connection failed before any data was exchanged.",
      evidence: [probe.url, tcp.message || tcp.code || "unknown error"],
      targetLabel: label,
    },
  ];
};

const tlsFindings = (probe: NetworkProbeResult): Finding[] => {
  const { tls } = probe;
  const label = labelOf(probe.target);
  const host = probe.target.host;
  if (!tls.attempted) return [];

  if (tls.notTls) {
    return [
      {
        id: "net.tls.not-tls",
        severity: "blocker",
        title: `Port ${probe.target.port ?? 443} on ${host} does not speak HTTPS`,
        detail:
          "The deployment advertises this address as secure, but the port " +
          "answered with something that is not TLS. The address is probably " +
          "configured with the wrong scheme or the wrong port.",
        evidence: [probe.url, tls.message || "no TLS handshake"],
        targetLabel: label,
      },
    ];
  }

  if (tls.ok) return [];

  if (tls.expired) {
    return [
      {
        id: "net.tls.expired",
        severity: "warning",
        title: `The certificate for ${host} has expired`,
        detail:
          "Orkestrator itself will still connect, but signing in happens in your " +
          "normal web browser, which will refuse an expired certificate. The " +
          "server's certificate needs renewing.",
        evidence: [probe.url, tls.validTo ? `expired ${tls.validTo}` : "expired"],
        targetLabel: label,
      },
    ];
  }

  if (tls.hostnameMismatch) {
    return [
      {
        id: "net.tls.hostname-mismatch",
        severity: "warning",
        title: `The certificate for ${host} is issued to a different name`,
        detail:
          "Orkestrator accepts it anyway, but your web browser will not, so the " +
          "sign-in step will fail even though the connection here works.",
        evidence: [probe.url, tls.subject ? `certificate for ${tls.subject}` : "", tls.authorizationError || ""].filter(Boolean),
        targetLabel: label,
      },
    ];
  }

  if (tls.selfSigned) {
    return [
      {
        id: "net.tls.self-signed",
        severity: "warning",
        title: `${host} uses a self-signed certificate`,
        detail:
          "Orkestrator is configured to accept these, so this is not what is " +
          "blocking the connection — but signing in opens your normal web " +
          "browser, and that will show a warning you have to click through.",
        evidence: [probe.url, tls.issuer ? `issued by ${tls.issuer}` : "self-signed"],
        targetLabel: label,
      },
    ];
  }

  return [
    {
      id: "net.tls.failed",
      severity: "warning",
      title: `The secure connection to ${host} could not be established`,
      detail: "The TLS handshake did not complete.",
      evidence: [probe.url, tls.authorizationError || tls.message || "unknown"],
      targetLabel: label,
    },
  ];
};

const httpFindings = (
  probe: NetworkProbeResult,
  context: DiagnoseInput["context"],
): Finding[] => {
  const { http } = probe;
  const label = labelOf(probe.target);
  if (!http.attempted || http.ok || http.status === undefined) return [];

  const shared = { evidence: [probe.url, `HTTP ${http.status} ${http.statusText ?? ""}`.trim()], targetLabel: label };

  if (http.status === 404) {
    return [
      {
        id: "net.http.404",
        severity: "blocker",
        title: "The server answered, but not at the address this deployment advertises",
        detail:
          context.kind === "discovery"
            ? "Something is running here, but it is not an Arkitekt coordination " +
              "server — or it is mounted under a different path."
            : "The service is running but its health-check path is not there, " +
              "which usually means a reverse proxy in front of it is routing to " +
              "the wrong place.",
        ...shared,
      },
    ];
  }

  if (http.status === 401 || http.status === 403) {
    return [
      {
        id: "net.http.401",
        severity: "blocker",
        title: "Something in front of the server is demanding its own login",
        detail:
          "The health check was rejected before it reached the service. A proxy, " +
          "a company gateway or a captive portal is intercepting the request.",
        ...shared,
      },
    ];
  }

  if (http.status >= 500) {
    return [
      {
        id: "net.http.5xx",
        severity: "blocker",
        title: `The server is reachable but returned an error (${http.status})`,
        detail:
          "The network is fine and something is listening — the service behind " +
          "it is failing. This is a problem on the server, not on this computer.",
        ...shared,
      },
    ];
  }

  return [
    {
      id: "net.http.unexpected",
      severity: "warning",
      title: `Unexpected response from the server (${http.status})`,
      detail: "The health check answered with a status that was not understood.",
      ...shared,
    },
  ];
};

/* ───────────────────────── discovery-specific ─────────────────────────── */

const discoveryFindings = (input: DiagnoseInput): Finding[] => {
  if (input.context.kind !== "discovery") return [];
  const findings: Finding[] = [];
  const error = input.originalError || "";

  // `discover.tsx` deliberately lets a pre-OAuth deployment fail zod rather
  // than collapsing it into "unreachable"; this turns that into a sentence.
  if (/parse|invalid|expected|required|zod/i.test(error) && /fakts|endpoint/i.test(error)) {
    findings.push({
      id: "discovery.schema-mismatch",
      severity: "blocker",
      title: "The server answered, but speaks an older protocol",
      detail:
        "There is an Arkitekt deployment at this address, but its configuration " +
        "is missing fields this version of Orkestrator needs. The deployment has " +
        "to be upgraded before this app can sign in to it.",
      evidence: [error],
      docs: ARKITEKT_DOCS,
    });
  }

  // https failed, http worked: worth saying out loud, because it is a real
  // deployment that simply has no TLS yet.
  const https = input.network.find((probe) => probe.target.ssl);
  const http = input.network.find((probe) => !probe.target.ssl);
  if (https && http && !https.http.ok && http.http.ok) {
    findings.push({
      id: "discovery.https-failed-http-worked",
      severity: "warning",
      title: "This server is only available over plain HTTP",
      detail:
        "The secure address did not answer but the insecure one did. It will " +
        "work, but everything you send to it travels unencrypted.",
      evidence: [`ok: ${http.url}`, `failed: ${https.url}`],
    });
  }

  return findings;
};

/* ─────────────────────── the hub's own report ─────────────────────────── */

/** No clock in here, so the timestamp is shown as reported, not "2 min ago". */
const hubEvidence = (hub: HubHealthFacts): string[] => [
  `hub: ${hub.name}${hub.version ? ` (${hub.version})` : ""}`,
  `last report: ${hub.lastSeenAt ?? "never"}`,
  ...(hub.meshHost ? [`hub mesh address: ${hub.meshHost}`] : []),
];

/** Did any alias of this service answer from here? Undefined: not probed. */
const clientReached = (input: DiagnoseInput, serviceKey: string): boolean | undefined => {
  const probes = input.network.filter((probe) => probe.target.serviceKey === serviceKey);
  if (probes.length === 0) return undefined;
  return probes.some((probe) => probe.http.ok);
};

/**
 * The hub's word, set against the probes. This is the only witness on the far
 * side of the connection: it splits "the service is down" (nothing on this
 * computer will fix it) from "the service is up and the path to it is broken"
 * (which is what every other rule in here is about).
 */
const hubFindings = (input: DiagnoseInput): Finding[] => {
  const hub = input.hub;
  if (!hub) return [];
  const evidence = hubEvidence(hub);

  if (!hub.lastSeenAt) {
    return [
      {
        id: "hub.never-reported",
        severity: "info",
        title: `${hub.name} has never reported its own health`,
        detail:
          "The hub does not tell the coordination server how it is doing, so " +
          "only this computer's side of the connection could be checked.",
        evidence,
      },
    ];
  }

  const probedKeys = [
    ...new Set(input.network.map((probe) => probe.target.serviceKey).filter((key): key is string => !!key)),
  ];
  const anyAnswered = input.network.some((probe) => probe.http.ok);

  if (!hub.online) {
    const probed = input.network.length > 0;
    const nothingAnswers = probed && !anyAnswered;
    return [
      {
        id: "hub.offline",
        severity: probed && anyAnswered ? "warning" : "blocker",
        title:
          probed && anyAnswered
            ? `${hub.name} has stopped reporting, but its services answer`
            : `${hub.name} has stopped reporting — the hub itself looks down`,
        detail:
          probed && anyAnswered
            ? "The hub has gone quiet towards the coordination server, yet its services " +
              "answer from here. Its health reporting is broken, not the services."
            : "The hub has not checked in with the coordination server for several " +
              "reporting intervals" +
              (nothingAnswers ? ", and none of its addresses answer from here" : "") +
              ". The machine, its network or the hub software is most likely down; " +
              "nothing on this computer will fix that. Ask whoever runs the hub.",
        evidence,
      },
    ];
  }

  const findings: Finding[] = [];

  if (hub.meshConnected === false && builtInMeshTargets(input, targetsOf(input)).length > 0) {
    findings.push({
      id: "hub.mesh-disconnected",
      severity: "blocker",
      title: `${hub.name} reports that it is not on the mesh`,
      detail:
        "The addresses below are on a private mesh, and the hub says its own " +
        "node is not connected to it, so nothing can reach it there — from any " +
        "computer. This has to be fixed on the hub.",
      evidence: [...evidence, ...builtInMeshTargets(input, targetsOf(input)).map((target) => target.host)],
    });
  }

  for (const serviceKey of probedKeys) {
    const reached = clientReached(input, serviceKey);
    if (reached === undefined) continue;
    const comparison = compareService(hub, serviceKey, reached ? "ok" : "failing");
    const reason = comparison.reason ? [`hub says: ${comparison.reason}`] : [];

    switch (comparison.verdict) {
      case "agree-down":
        findings.push({
          id: "hub.instance-unhealthy",
          severity: "blocker",
          title: `${hub.name} reports ${serviceKey} as down`,
          detail:
            `${HUB_VERDICT_TEXT["agree-down"]} The service is failing on the hub ` +
            "itself, so the connection from this computer is not the problem. Ask " +
            "whoever runs the hub.",
          evidence: [...reason, ...evidence],
          targetLabel: serviceKey,
        });
        break;
      case "path-broken":
        findings.push({
          id: "hub.healthy-client-fails",
          severity: "warning",
          title: `${hub.name} sees ${serviceKey} running, but it cannot be reached from here`,
          detail:
            `${HUB_VERDICT_TEXT["path-broken"]} The findings about the network and ` +
            "the mesh are where the answer is.",
          evidence,
          targetLabel: serviceKey,
        });
        break;
      case "stale-report":
        findings.push({
          id: "hub.stale-report",
          severity: "info",
          title: `${serviceKey} answers, although ${hub.name} reports it down`,
          detail:
            `${HUB_VERDICT_TEXT["stale-report"]} It may have recovered since the ` +
            "last report.",
          evidence: [...reason, ...evidence],
          targetLabel: serviceKey,
        });
        break;
      default:
        break;
    }
  }

  return findings;
};

/** Every probed service the hub reported on, and both sides call up. */
const hubAgrees = (input: DiagnoseInput): boolean => {
  const hub = input.hub;
  if (!hub?.online) return false;
  const keys = [...new Set(input.network.map((probe) => probe.target.serviceKey).filter((key): key is string => !!key))];
  const compared = keys.map((key) => compareService(hub, key, clientReached(input, key) ? "ok" : "failing"));
  return compared.length > 0 && compared.every((comparison) => comparison.verdict === "agree-ok");
};

/* ──────────────────────────── assembly ────────────────────────────────── */

/**
 * A mesh blocker — or a hub that says it is down — explains every timeout and
 * NXDOMAIN underneath it. Keep those in the report — they are the evidence —
 * but stop them shouting over the one sentence that actually helps.
 */
const demoteSymptoms = (findings: Finding[]): Finding[] => {
  const causeBlocker = findings.some(
    (finding) =>
      (finding.id.startsWith("upstream.") || finding.id.startsWith("mesh.") || finding.id.startsWith("hub.")) &&
      finding.severity === "blocker",
  );
  if (!causeBlocker) return findings;

  const SYMPTOMS = ["net.tcp.timeout", "net.tcp.unreachable", "net.dns.nxdomain"];
  return findings.map((finding) =>
    SYMPTOMS.includes(finding.id) ? { ...finding, severity: "info" as const } : finding,
  );
};

const diagnoseServices = (input: DiagnoseInput): Finding[] => {
  const targets = targetsOf(input);
  const findings: Finding[] = [];

  if (input.probesAvailable === false) {
    const relevant = meshTargets(targets);
    findings.push({
      id: "doctor.unavailable",
      severity: "info",
      title: "Detailed diagnostics need the desktop app",
      detail:
        "This build cannot inspect DNS, certificates or your network software, " +
        "so only the address itself could be examined." +
        (relevant.length > 0
          ? ` The address ${relevant[0].host} looks like a private mesh address, ` +
            "which usually means you have to be connected to that network first."
          : ""),
      evidence: targets.map((target) => target.host),
    });
    findings.push(...hubFindings(input));
    return rankFindings(findings);
  }

  // A target the built-in mesh routes is probed THROUGH that mesh (main asks
  // the same routing table), and only such a probe may speak for it: a
  // direct probe of a mesh-routed host would report this computer's DNS,
  // which the app never uses for it. The system-client rules only get the
  // addresses our mesh does not cover.
  const isCovered = (host: string) => !!coveringMesh(input.sidecar, host);
  const uncoveredTargets = targets.filter((target) => !isCovered(target.host));
  const systemMeshTargets = meshTargets(uncoveredTargets);

  findings.push(...sidecarFindings(input, targets));
  if (systemMeshTargets.length > 0) findings.push(...meshFindings(input.mesh, uncoveredTargets));
  findings.push(...discoveryFindings(input));

  for (const probe of input.network) {
    if (isCovered(probe.target.host) && !probe.viaMeshProxy) continue;
    findings.push(...dnsFindings(probe, input.mesh));
    findings.push(...tcpFindings(probe));
    findings.push(...tlsFindings(probe));
    findings.push(...httpFindings(probe, input.context));
  }

  if (systemMeshTargets.length > 0) findings.push(...meshHealthy(input.mesh, uncoveredTargets, findings));

  // Main got through where the app did not — the only finding that points at
  // the app itself rather than at the network.
  const anyHttpOk = input.network.some((probe) => probe.http.ok);
  if (anyHttpOk && input.rendererReachable === false) {
    findings.push({
      id: "net.ok.renderer-failed",
      severity: "blocker",
      title: "The server answers, but Orkestrator itself cannot reach it",
      detail:
        "A direct request from this computer succeeded while the app's own " +
        "request failed. That points at something inside the app — a stale " +
        "session or a cached address — rather than at your network. Signing out " +
        "and back in usually clears it.",
      evidence: input.network.filter((probe) => probe.http.ok).map((probe) => probe.url),
    });
  }

  const fromHub = hubFindings(input);

  // Everything answered and the hub has nothing worse than a note: the
  // verdict is still "all clear". Notes rank above `ok`, so they are placed
  // after it by hand rather than left to `rankFindings`.
  if (findings.length === 0 && fromHub.every((finding) => finding.severity === "info")) {
    const agrees = hubAgrees(input);
    const allClear: Finding = {
      id: "net.all-clear",
      severity: "ok",
      title: "Every address answered",
      detail:
        "All of the addresses this deployment advertises are reachable from " +
        "this computer right now." +
        (agrees ? ` ${input.hub!.name} reports the same services healthy.` : "") +
        " Whatever went wrong was either temporary or is not a network " +
        "problem — try connecting again.",
      evidence: [
        ...input.network.map((probe) => probe.url),
        ...(agrees ? hubEvidence(input.hub!) : []),
      ],
    };
    return [allClear, ...rankFindings(fromHub)];
  }

  findings.push(...fromHub);

  return rankFindings(demoteSymptoms(findings));
};

/* ─────────────────────────── upstream hops ─────────────────────────────── */

/**
 * The hops in front of the services. Probed on every service-mode run so
 * "the coordination server does not answer either" is a fact, not a guess —
 * and that one fact outranks everything about the hub, because it means this
 * computer is not getting out at all.
 */
const upstreamFindings = (
  input: DiagnoseInput,
  upstream: NetworkProbeResult[],
  anyServiceAnswered: boolean,
): Finding[] => {
  const findings: Finding[] = [];
  const failures = (probes: NetworkProbeResult[]) =>
    probes.map((probe) => [probe.url, failureLine(probe)].filter(Boolean).join(" — "));

  const coordination = upstream.filter((probe) => probe.target.role === "coordination");
  if (coordination.length > 0 && !coordination.some((probe) => probe.http.ok)) {
    const host = coordination[0].target.host;
    findings.push(
      anyServiceAnswered
        ? {
            id: "upstream.coordination.unreachable",
            severity: "warning",
            title: `The services answer, but ${host} does not`,
            detail:
              "This computer reaches the deployment but not the coordination server " +
              "it signed in through. What works now keeps working until the session " +
              "has to be refreshed; signing in, and the hub's own health report, will fail.",
            evidence: failures(coordination),
            targetLabel: host,
          }
        : {
            id: "upstream.coordination.unreachable",
            severity: "blocker",
            title: `This computer cannot reach ${host} either`,
            detail:
              "Not even the coordination server answers, so this is not about the " +
              "hub or any one service: this computer is not getting out. Check the " +
              "internet connection, a VPN, a firewall or a proxy.",
            evidence: failures(coordination),
            targetLabel: host,
          },
    );
  }

  const control = upstream.filter((probe) => probe.target.role === "mesh-control");
  // Any HTTP answer at all proves the server is there; its root has no contract.
  if (control.length > 0 && !control.some((probe) => probe.http.status !== undefined)) {
    const host = control[0].target.host;
    const meshRunning =
      (input.sidecar ? deploymentMeshes(input, input.sidecar) : []).some((mesh) => mesh.status.state === "running") ||
      (input.mesh?.available === true && input.mesh.backendState === "Running");
    findings.push({
      id: "upstream.mesh-control.unreachable",
      severity: meshRunning ? "info" : "blocker",
      title: `The mesh control server ${host} does not answer`,
      detail: meshRunning
        ? "The mesh is already up, and a running node does not need its control " +
          "server moment to moment — but a new sign-in, or a peer that changed " +
          "address, will not get through until it is back."
        : "Joining the mesh goes through this server, and it does not answer from " +
          "here, so the private addresses below cannot be reached yet.",
      evidence: failures(control),
      targetLabel: host,
    });
  }

  return findings;
};

export const diagnose = (input: DiagnoseInput): Finding[] => {
  const upstream = input.network.filter((probe) => isUpstream(probe.target));
  if (upstream.length === 0 && !input.targets.some(isUpstream)) return diagnoseServices(input);

  const serviceNetwork = input.network.filter((probe) => !isUpstream(probe.target));
  const base = diagnoseServices({
    ...input,
    targets: input.targets.filter((target) => !isUpstream(target)),
    network: serviceNetwork,
  });
  const fromUpstream = upstreamFindings(input, upstream, serviceNetwork.some((probe) => probe.http.ok));

  // Upstream fine: the service verdict stands exactly as ranked (including a
  // hand-placed all-clear), and the upstream notes follow it — a note about
  // the mesh control server must not take the headline from the services.
  const loud = fromUpstream.some((finding) => finding.severity === "blocker" || finding.severity === "warning");
  if (!loud) return [...base, ...fromUpstream];

  // An upstream problem makes "every address answered" untrue.
  return rankFindings(
    demoteSymptoms([...base.filter((finding) => finding.id !== "net.all-clear"), ...fromUpstream]),
  );
};
