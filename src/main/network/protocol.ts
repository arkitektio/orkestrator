/**
 * Main tells every window when the computer's network may have changed, so
 * the connection can check its services again instead of waiting for the
 * user to notice (`core/connection/arkitekt/controller/reachability.ts`).
 */
export const NETWORK_CHANGED_CHANNEL = "network:changed";

export type NetworkChange = {
  /** `resume`: the computer woke up. `interfaces`: an address came or went (Wi-Fi, cable, a VPN). */
  reason: "resume" | "interfaces";
};
