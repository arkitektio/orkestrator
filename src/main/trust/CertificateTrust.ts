import { app, ipcMain, session } from "electron";
import Store from "electron-store";
import { AppModule } from "../modules/AppModule";
import { IpcTransport } from "../modules/IpcTransport";
import { pinnedVerdict, parsePins } from "./pins";
import { allowsBadCertificate, normalizeHost, parseHosts, verifyResult } from "./policy";
import {
  TRUST_DISCOVERY_HOSTS_CHANNEL,
  TRUST_FAKTS_HOSTS_CHANNEL,
  TRUST_MAX_HOSTS,
  TRUST_SEED_HOSTS_CHANNEL,
} from "./protocol";

/** The electron-store keys for the fakts hosts and pins, read before the renderer loads. */
export const FAKTS_HOSTS_KEY = "trust.faktsHosts";
export const PINS_KEY = "trust.pins";

/** A payload is `{ hosts, pins }`, or (from an older renderer) the host list alone. */
const readPayload = (payload: unknown): { hosts: string[]; pins: Map<string, string[]> } => {
  if (Array.isArray(payload)) return { hosts: parseHosts(payload, TRUST_MAX_HOSTS), pins: new Map() };
  const value = payload != null && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  return { hosts: parseHosts(value.hosts, TRUST_MAX_HOSTS), pins: parsePins(value.pins, TRUST_MAX_HOSTS) };
};

const merged = (...sets: Map<string, string[]>[]): Map<string, string[]> => {
  const out = new Map<string, string[]>();
  for (const set of sets) {
    for (const [host, pems] of set) out.set(host, [...new Set([...(out.get(host) ?? []), ...pems])]);
  }
  return out;
};

/**
 * Which certificates the app accepts beyond Chromium's own verdict:
 *
 *  - a strict host — a TLS alias of a hub that registered its certificate — is
 *    trusted with exactly that certificate and nothing else (`pins.ts`);
 *  - any other host the user's fakts name may present a self-signed certificate
 *    (`policy.ts`), as before; every other host gets Chromium's verdict.
 *
 * Chromium's requests are checked through the default session's verify proc —
 * fetch, WebSockets and workers alike; Node's (the S3 transfers) ask `allows` and
 * `pinsFor` for their agents.
 *
 * The proc reads the current sets on every call, so a change applies to the next
 * verification. It does NOT revisit a verdict Chromium already cached, which is
 * why trust is seeded from the preload before any page script runs (see
 * `protocol.ts`).
 *
 * Register it before any module that opens a window: its `whenReady` callback
 * must install the proc before the first page loads.
 */
export class CertificateTrust implements AppModule {
  private readonly store = new Store();
  private faktsHosts: Set<string>;
  private faktsPins: Map<string, string[]>;
  private readonly discoveryHosts = new Set<string>();
  private discoveryPins = new Map<string, string[]>();
  private trusted = new Set<string>();
  private pins = new Map<string, string[]>();

  constructor(private readonly ipcTransport: IpcTransport) {
    this.faktsHosts = new Set(parseHosts(this.store.get(FAKTS_HOSTS_KEY), TRUST_MAX_HOSTS));
    this.faktsPins = parsePins(this.store.get(PINS_KEY), TRUST_MAX_HOSTS);
    this.rebuild();
  }

  setup() {
    app.whenReady().then(() => {
      session.defaultSession.setCertificateVerifyProc((request, callback) => {
        callback(pinnedVerdict(request, this.pins) ?? verifyResult(request, this.trusted));
      });
    });

    this.ipcTransport.handleChannel(TRUST_FAKTS_HOSTS_CHANNEL, (_event, payload: unknown) => {
      const { hosts, pins } = readPayload(payload);
      this.setFakts(new Set(hosts), pins);
    });

    this.ipcTransport.handleChannel(TRUST_DISCOVERY_HOSTS_CHANNEL, (_event, payload: unknown) => {
      const { hosts, pins } = readPayload(payload);
      for (const host of hosts) this.discoveryHosts.add(host);
      this.discoveryPins = merged(this.discoveryPins, pins);
      this.rebuild();
    });

    // Synchronous on purpose: the preload blocks on it so trust is in place
    // before the page's first request.
    ipcMain.on(TRUST_SEED_HOSTS_CHANNEL, (event, payload: unknown) => {
      const { hosts, pins } = readPayload(payload);
      this.setFakts(new Set([...this.faktsHosts, ...hosts]), merged(this.faktsPins, pins));
      event.returnValue = true;
    });
  }

  /** Whether `hostname` may present a certificate that fails verification. Never a pinned host. */
  allows = (hostname: string): boolean => {
    const host = normalizeHost(hostname);
    return host != null && !this.pins.has(host) && allowsBadCertificate(host, this.trusted);
  };

  /** The certificates `hostname` is pinned to — the only ones its connections may present. */
  pinsFor = (hostname: string): readonly string[] | undefined => {
    const host = normalizeHost(hostname);
    return host ? this.pins.get(host) : undefined;
  };

  private setFakts(hosts: Set<string>, pins: Map<string, string[]>) {
    this.faktsHosts = hosts;
    this.faktsPins = pins;
    this.store.set(FAKTS_HOSTS_KEY, [...hosts]);
    this.store.set(PINS_KEY, Object.fromEntries(pins));
    this.rebuild();
  }

  private rebuild() {
    this.trusted = new Set([...this.faktsHosts, ...this.discoveryHosts]);
    this.pins = merged(this.faktsPins, this.discoveryPins);
  }
}
