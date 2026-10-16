import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { AppModule } from "../modules/AppModule";
import type { IpcTransport } from "../modules/IpcTransport";
import {
  EDUROAM_EAP_CONFIG_CHANNEL,
  EDUROAM_SEARCH_CHANNEL,
  WIFI_PROFILES_DELETE_CHANNEL,
  WIFI_PROFILES_LIST_CHANNEL,
  WIFI_PROFILES_SAVE_CHANNEL,
  type EduroamEapConfigRequest,
  type EduroamInstitution,
  type EduroamSearchRequest,
  type WifiProfile,
  type WifiProfileList,
} from "./protocol";

export type SecretBox = {
  isEncryptionAvailable(): boolean;
  encryptString(plain: string): Buffer;
  decryptString(encrypted: Buffer): string;
};

export type WifiServiceDeps = {
  /** `app.getPath("userData")`. */
  userData: () => string;
  /** Electron's `safeStorage`. */
  secrets: SecretBox;
  fetch: typeof fetch;
  now?: () => number;
};

const PROFILES_FILE = "wifi-profiles.json";
const DISCOVERY_FILE = join("eduroam", "discovery.json");
export const EDUROAM_DISCOVERY_URL = "https://discovery.eduroam.app/v1/discovery.json";
const DISCOVERY_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const EAP_CONFIG_MAX_BYTES = 512 * 1024;

type Secrets = Pick<WifiProfile, "password" | "caPem">;
type StoredProfile = Omit<WifiProfile, keyof Secrets> & { secrets?: string | null };
type StoredFile = { version: 1; profiles: StoredProfile[] };

type DiscoveryInstance = {
  id?: unknown;
  name?: unknown;
  country?: unknown;
  profiles?: { id?: unknown; name?: unknown; eapconfig_endpoint?: unknown }[];
};

const str = (value: unknown): string | null => (typeof value === "string" && value ? value : null);

export class WifiService implements AppModule {
  private discovery: EduroamInstitution[] | null = null;
  private readonly now: () => number;

  constructor(
    private readonly transport: Pick<IpcTransport, "handleChannel">,
    private readonly deps: WifiServiceDeps,
  ) {
    this.now = deps.now ?? Date.now;
  }

  setup() {
    this.transport.handleChannel(WIFI_PROFILES_LIST_CHANNEL, () => this.list());
    this.transport.handleChannel(WIFI_PROFILES_SAVE_CHANNEL, (_e, profile: WifiProfile) => this.save(profile));
    this.transport.handleChannel(WIFI_PROFILES_DELETE_CHANNEL, (_e, { id }: { id: string }) => this.remove(id));
    this.transport.handleChannel(EDUROAM_SEARCH_CHANNEL, (_e, request: EduroamSearchRequest) => this.search(request));
    this.transport.handleChannel(EDUROAM_EAP_CONFIG_CHANNEL, (_e, request: EduroamEapConfigRequest) =>
      this.eapConfig(request),
    );
  }

  private path(file: string) {
    return join(this.deps.userData(), file);
  }

  private canEncrypt() {
    try {
      return this.deps.secrets.isEncryptionAvailable();
    } catch {
      return false;
    }
  }

  private readStored(): StoredProfile[] {
    try {
      const file = JSON.parse(readFileSync(this.path(PROFILES_FILE), "utf8")) as StoredFile;
      return Array.isArray(file.profiles) ? file.profiles : [];
    } catch {
      return [];
    }
  }

  private writeStored(profiles: StoredProfile[]) {
    const file: StoredFile = { version: 1, profiles };
    writeFileSync(this.path(PROFILES_FILE), JSON.stringify(file, null, 2), { mode: 0o600 });
  }

  private open(stored: StoredProfile): WifiProfile {
    const { secrets, ...profile } = stored;
    if (!secrets || !this.canEncrypt()) return profile;
    try {
      const opened = JSON.parse(this.deps.secrets.decryptString(Buffer.from(secrets, "base64"))) as Secrets;
      return { ...profile, ...opened };
    } catch {
      // A keychain that changed (another machine, a reset) cannot open it: the secrets are gone.
      return profile;
    }
  }

  private seal(profile: WifiProfile): StoredProfile {
    const { password, caPem, ...rest } = profile;
    if (!this.canEncrypt() || (!password && !caPem)) return { ...rest, secrets: null };
    const secrets = this.deps.secrets.encryptString(JSON.stringify({ password, caPem })).toString("base64");
    return { ...rest, secrets };
  }

  list(): WifiProfileList {
    return { profiles: this.readStored().map((p) => this.open(p)), secretsPersisted: this.canEncrypt() };
  }

  save(profile: WifiProfile): WifiProfileList {
    if (!profile?.id || !profile.ssid) throw new Error("A Wi-Fi profile needs an id and an SSID.");
    const stored = this.readStored();
    const index = stored.findIndex((p) => p.id === profile.id);
    const sealed = this.seal(profile);
    if (index >= 0) stored[index] = sealed;
    else stored.push(sealed);
    this.writeStored(stored);
    return this.list();
  }

  remove(id: string): WifiProfileList {
    this.writeStored(this.readStored().filter((p) => p.id !== id));
    return this.list();
  }

  private async loadDiscovery(): Promise<EduroamInstitution[]> {
    if (this.discovery) return this.discovery;
    const cache = this.path(DISCOVERY_FILE);
    let raw: string | null = null;
    const fresh = existsSync(cache) && this.now() - statSync(cache).mtimeMs < DISCOVERY_MAX_AGE_MS;
    if (fresh) raw = readFileSync(cache, "utf8");
    if (!raw) {
      try {
        const response = await this.deps.fetch(EDUROAM_DISCOVERY_URL);
        if (!response.ok) throw new Error(`eduroam directory answered ${response.status}`);
        raw = await response.text();
        mkdirSync(dirname(cache), { recursive: true });
        writeFileSync(cache, raw);
      } catch (error) {
        // Offline: a stale copy beats nothing.
        if (!existsSync(cache)) throw error;
        raw = readFileSync(cache, "utf8");
      }
    }
    const instances = (JSON.parse(raw) as { instances?: DiscoveryInstance[] }).instances ?? [];
    this.discovery = instances.flatMap((instance): EduroamInstitution[] => {
      const id = str(instance.id);
      const name = str(instance.name);
      if (!id || !name) return [];
      const profiles = (instance.profiles ?? []).flatMap((p) => {
        const pid = str(p.id);
        const endpoint = str(p.eapconfig_endpoint);
        return pid && endpoint ? [{ id: pid, name: str(p.name) ?? name, eapconfigEndpoint: endpoint }] : [];
      });
      return profiles.length ? [{ id, name, country: str(instance.country), profiles }] : [];
    });
    return this.discovery;
  }

  async search({ query, limit = 25 }: EduroamSearchRequest): Promise<EduroamInstitution[]> {
    const needle = query.trim().toLowerCase();
    if (needle.length < 2) return [];
    const institutions = await this.loadDiscovery();
    const starts: EduroamInstitution[] = [];
    const contains: EduroamInstitution[] = [];
    for (const institution of institutions) {
      const name = institution.name.toLowerCase();
      if (name.startsWith(needle)) starts.push(institution);
      else if (name.includes(needle)) contains.push(institution);
    }
    return [...starts, ...contains].slice(0, limit);
  }

  async eapConfig({ eapconfigEndpoint }: EduroamEapConfigRequest): Promise<string> {
    // Only endpoints the directory itself listed: this is not a general fetch proxy.
    const institutions = await this.loadDiscovery();
    const known = institutions.some((i) => i.profiles.some((p) => p.eapconfigEndpoint === eapconfigEndpoint));
    if (!known) throw new Error("Not an eduroam profile from the directory.");
    const response = await this.deps.fetch(eapconfigEndpoint);
    if (!response.ok) throw new Error(`The institution's configuration answered ${response.status}`);
    const text = await response.text();
    if (text.length > EAP_CONFIG_MAX_BYTES) throw new Error("The institution's configuration is too large.");
    return text;
  }
}
