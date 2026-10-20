import type { MeshFirewallState } from "../../../../../main/mesh/protocol";
import { getPlatform } from "@/core/util/platform";
import { useEffect, useState } from "react";
import { meshBridge } from "./bridge";

/**
 * Windows Defender Firewall asks "allow incoming connections?" the first time
 * meshd binds its WireGuard UDP socket (every interface, so peers can reach
 * the node directly). Without inbound access the mesh still works — replies
 * to meshd's own packets get in, so hole-punched paths form — but peers
 * cannot reach this computer first, so some connections go through a relay.
 *
 * So before the first mesh starts on a computer with no firewall rule for
 * meshd yet, the window explains what is coming and waits until the user has
 * read it. Asked once per computer: Windows remembers the answer per exe
 * path, and so do we.
 */

const SEEN_KEY = "orkestrator.mesh.firewallNotice";

const seen = (): boolean => {
  try {
    return localStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return false;
  }
};

const markSeen = () => {
  try {
    localStorage.setItem(SEEN_KEY, "1");
  } catch {
    // No storage: the explainer may show again, which is harmless.
  }
};

/* ─────────────── the ask: one explainer, shown by the prompter ─────────── */

type Ask = { resolve: () => void };

let ask: Ask | undefined;
const listeners = new Set<() => void>();
const publish = () => listeners.forEach((listener) => listener());

/** Whether an explainer is waiting to be shown (`MeshFirewallPrompt`). */
export const meshFirewallAsk = {
  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot: (): boolean => !!ask,
};

/** The user read the explainer (or closed it): let the mesh start. */
export const acknowledgeMeshFirewall = () => {
  const current = ask;
  ask = undefined;
  current?.resolve();
  publish();
};

const askUser = (): Promise<void> =>
  new Promise((resolve) => {
    ask = { resolve };
    publish();
  });

/* ─────────────────────────── the gate ──────────────────────────────────── */

const firewallState = async (): Promise<MeshFirewallState> => {
  try {
    return (await meshBridge()?.firewall()) ?? "unknown";
  } catch {
    return "unknown";
  }
};

const check = async (): Promise<void> => {
  if ((await firewallState()) !== "none") {
    // Windows already asked (whatever the answer); nothing to explain.
    markSeen();
    return;
  }
  // Nobody here to show it (the quick bar): start without it, ask next time.
  if (listeners.size === 0) return;
  markSeen();
  await askUser();
};

/**
 * The firewall's rules for meshd, read once on mount (Settings → Mesh).
 * `undefined` while asking, and off Windows.
 */
export const useMeshFirewallState = (): MeshFirewallState | undefined => {
  const [state, setState] = useState<MeshFirewallState | undefined>();
  useEffect(() => {
    if (getPlatform() !== "win32") return;
    let live = true;
    void firewallState().then((next) => live && setState(next));
    return () => {
      live = false;
    };
  }, []);
  return state;
};

let gate: Promise<void> | undefined;
let settled = false;

/**
 * What a claim must wait for first, or nothing (then it goes out at once).
 * The first claim that would start a mesh on Windows runs the check; every
 * claim after it waits on the same answer, so claims keep their order.
 */
export const meshFirewallGate = (starting: boolean, platform: string = getPlatform()): Promise<void> | undefined => {
  if (settled) return undefined;
  if (!gate) {
    if (!starting) return undefined;
    if (platform !== "win32" || seen()) {
      settled = true;
      return undefined;
    }
    gate = check().then(() => {
      settled = true;
    });
  }
  return gate;
};

/** Tests only: forget the gate and any pending ask. */
export const resetMeshFirewallGate = () => {
  gate = undefined;
  settled = false;
  ask = undefined;
};
