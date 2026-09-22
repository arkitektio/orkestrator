import type {
  MeshProbeResult,
  NetworkProbeResult,
  ProbeTarget,
} from "../../../../../main/doctor/protocol";
import { classifyHost, isMeshClass } from "./classify";
import type { DiagnoseInput, Finding } from "./findings";
import { rankFindings } from "./findings";
import { matchPeer, tailnetMismatch } from "./meshMatch";

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
const ARKITEKT_DOCS = "https://arkitekt.live/docs/introduction/basics";

const targetsOf = (input: DiagnoseInput): ProbeTarget[] => input.targets;

const meshTargets = (targets: ProbeTarget[]): ProbeTarget[] =>
  targets.filter((target) => isMeshClass(classifyHost(target.host)));

const labelOf = (target: ProbeTarget): string => target.label || target.host;

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

/* ──────────────────────────── assembly ────────────────────────────────── */

/**
 * A mesh blocker explains every timeout and NXDOMAIN underneath it. Keep those
 * in the report — they are the evidence — but stop them shouting over the one
 * sentence that actually helps.
 */
const demoteSymptoms = (findings: Finding[]): Finding[] => {
  const meshBlocker = findings.some(
    (finding) => finding.id.startsWith("mesh.") && finding.severity === "blocker",
  );
  if (!meshBlocker) return findings;

  const SYMPTOMS = ["net.tcp.timeout", "net.tcp.unreachable", "net.dns.nxdomain"];
  return findings.map((finding) =>
    SYMPTOMS.includes(finding.id) ? { ...finding, severity: "info" as const } : finding,
  );
};

export const diagnose = (input: DiagnoseInput): Finding[] => {
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
    return rankFindings(findings);
  }

  findings.push(...meshFindings(input.mesh, targets));
  findings.push(...discoveryFindings(input));

  for (const probe of input.network) {
    findings.push(...dnsFindings(probe, input.mesh));
    findings.push(...tcpFindings(probe));
    findings.push(...tlsFindings(probe));
    findings.push(...httpFindings(probe, input.context));
  }

  findings.push(...meshHealthy(input.mesh, targets, findings));

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

  if (findings.length === 0) {
    findings.push({
      id: "net.all-clear",
      severity: "ok",
      title: "Every address answered",
      detail:
        "All of the addresses this deployment advertises are reachable from " +
        "this computer right now. Whatever went wrong was either temporary or " +
        "is not a network problem — try connecting again.",
      evidence: input.network.map((probe) => probe.url),
    });
  }

  return rankFindings(demoteSymptoms(findings));
};
