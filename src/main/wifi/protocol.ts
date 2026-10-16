/**
 * Saved Wi-Fi profiles and the eduroam directory, as main offers them to the
 * renderer. Device provisioning sends a profile to a device; the profiles
 * live in main so their secrets can be encrypted with the OS keychain
 * (`safeStorage`), and the eduroam lookups run in main because the renderer's
 * fetch is bound by CORS.
 *
 * SECRET: a profile carries a Wi-Fi password and possibly a CA certificate.
 * Nothing here is logged or attached to `src/main/issue-reporter.ts`.
 *
 * No runtime dependencies, so the preload and the renderer can import it.
 */

export const WIFI_PROFILES_LIST_CHANNEL = "wifi:profiles-list";
export const WIFI_PROFILES_SAVE_CHANNEL = "wifi:profiles-save";
export const WIFI_PROFILES_DELETE_CHANNEL = "wifi:profiles-delete";
export const EDUROAM_SEARCH_CHANNEL = "eduroam:search";
export const EDUROAM_EAP_CONFIG_CHANNEL = "eduroam:eap-config";

export type WifiInstitution = { id: string; name: string; country?: string | null };

export type WifiProfile = {
  id: string;
  ssid: string;
  type: "standard" | "eduroam";
  password?: string;
  /** eduroam: the user's EAP identity, e.g. `jdoe@uni.example`. */
  identity?: string;
  /** eduroam: the outer identity sent unencrypted, e.g. `anonymous@uni.example`. */
  anonymousIdentity?: string;
  /** eduroam: connect without checking the RADIUS server's certificate. */
  skipCertValidation?: boolean;
  /** eduroam: the CA that signed the RADIUS server's certificate, as PEM. */
  caPem?: string;
  institution?: WifiInstitution | null;
};

export type WifiProfileList = {
  profiles: WifiProfile[];
  /**
   * False where the OS offers no keychain (e.g. Linux without a secret
   * service): profiles are then saved WITHOUT their password and CA, and
   * those have to be entered again each time.
   */
  secretsPersisted: boolean;
};

export type EduroamProfileRef = { id: string; name: string; eapconfigEndpoint: string };

export type EduroamInstitution = WifiInstitution & { profiles: EduroamProfileRef[] };

export type EduroamSearchRequest = { query: string; limit?: number };

/** The raw eap-config XML for one institution's profile; the renderer parses it. */
export type EduroamEapConfigRequest = { eapconfigEndpoint: string };
