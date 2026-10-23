import { app, session } from "electron";
import Store from "electron-store";
import { AppModule } from "../modules/AppModule";
import { IpcTransport } from "../modules/IpcTransport";
import { allowsBadCertificate, parseHosts, verifyResult } from "./policy";
import { TRUST_DISCOVERY_HOSTS_CHANNEL, TRUST_FAKTS_HOSTS_CHANNEL, TRUST_MAX_HOSTS } from "./protocol";

/** The electron-store key for the fakts hosts, read before the renderer loads. */
export const FAKTS_HOSTS_KEY = "trust.faktsHosts";

/**
 * Lets the deployments the user's fakts name present self-signed certificates,
 * and no one else (see `policy.ts`). Chromium's requests are checked through
 * the default session's verify proc — fetch, WebSockets and workers alike;
 * Node's (the S3 transfers) ask `allows` for their agent's `rejectUnauthorized`.
 *
 * Register it before any module that opens a window: its `whenReady` callback
 * must install the proc before the first page loads.
 */
export class CertificateTrust implements AppModule {
  private readonly store = new Store();
  private faktsHosts: Set<string>;
  private readonly discoveryHosts = new Set<string>();
  private trusted = new Set<string>();
  private installed = false;

  constructor(private readonly ipcTransport: IpcTransport) {
    this.faktsHosts = new Set(parseHosts(this.store.get(FAKTS_HOSTS_KEY), TRUST_MAX_HOSTS));
    this.rebuild();
  }

  setup() {
    app.whenReady().then(() => this.installVerifyProc());

    this.ipcTransport.handleChannel(TRUST_FAKTS_HOSTS_CHANNEL, (_event, hosts: unknown) => {
      this.faktsHosts = new Set(parseHosts(hosts, TRUST_MAX_HOSTS));
      this.store.set(FAKTS_HOSTS_KEY, [...this.faktsHosts]);
      this.rebuild();
    });

    this.ipcTransport.handleChannel(TRUST_DISCOVERY_HOSTS_CHANNEL, (_event, hosts: unknown) => {
      for (const host of parseHosts(hosts, TRUST_MAX_HOSTS)) this.discoveryHosts.add(host);
      this.rebuild();
    });
  }

  /** Whether `hostname` may present a certificate that fails verification. */
  allows = (hostname: string): boolean => allowsBadCertificate(hostname, this.trusted);

  private rebuild() {
    const next = new Set([...this.faktsHosts, ...this.discoveryHosts]);
    const changed = next.size !== this.trusted.size || [...next].some((host) => !this.trusted.has(host));
    this.trusted = next;
    // Chromium caches a verdict per certificate and host; re-installing the
    // proc drops that cache, so a host refused (or accepted) a moment ago is
    // asked again.
    if (changed && this.installed) this.installVerifyProc();
  }

  private installVerifyProc() {
    session.defaultSession.setCertificateVerifyProc((request, callback) => {
      callback(verifyResult(request, this.trusted));
    });
    this.installed = true;
  }
}
