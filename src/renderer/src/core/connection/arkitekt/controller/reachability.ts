import type { NetworkChange } from "../../../../../../main/network/protocol";

/**
 * Hears that the network may have changed, from the two places that know:
 * the browser (`online`, after having been offline) and main, which sees an
 * address come or go and the computer wake from sleep
 * (`src/main/network/NetworkWatch.ts`). A laptop that moves from one network
 * to another stays "online" throughout, so the browser alone is not enough.
 *
 * It only reports; the supervisor decides what to check.
 */
export type ReachabilityChange = "online" | NetworkChange["reason"];

export type NetworkBridge = { onChange: (cb: (change: NetworkChange) => void) => () => void };

/** Main's network events; absent in a browser build, and every caller must cope. */
export const networkBridge = (): NetworkBridge | undefined => {
  if (typeof window === "undefined") return undefined;
  const bridge = (window as unknown as { api?: { network?: NetworkBridge } }).api?.network;
  return typeof bridge?.onChange === "function" ? bridge : undefined;
};

export const watchNetwork = (
  onChange: (why: ReachabilityChange) => void,
  {
    bridge = networkBridge(),
    target = typeof window === "undefined" ? undefined : window,
  }: { bridge?: NetworkBridge; target?: Pick<Window, "addEventListener" | "removeEventListener"> } = {},
): (() => void) => {
  const online = () => onChange("online");
  target?.addEventListener("online", online);
  const unbind = bridge?.onChange((change) => onChange(change.reason));
  return () => {
    target?.removeEventListener("online", online);
    unbind?.();
  };
};
