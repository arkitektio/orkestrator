import { useEffect, useState, useSyncExternalStore } from "react";

import { doctorAvailable, doctorBridge } from "@/core/connection/arkitekt/doctor/useConnectionDoctor";
import { useSettings } from "@/core/settings/store/SettingsContext";
import type { MeshProbeResult } from "../../../../../main/doctor/protocol";

/**
 * The Tailscale that the operating system runs — not the app's built-in mesh.
 *
 * The app does not own it, so it does not read it uninvited: asking it how a
 * peer is reached means running `tailscale status` on the user's machine.
 * That is asked for once, where the answer would be shown; the answer holds
 * for the session, and "remember" turns it into the `systemTailscale`
 * setting. The built-in mesh needs none of this — its status is the app's own.
 */

export type TailscaleConsent = "ask" | "allowed" | "denied";

let sessionAnswer: "allowed" | "denied" | undefined;
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => void listeners.delete(listener);
};

/** For tests: forget what was answered this session. */
export const resetTailscaleConsent = () => {
  sessionAnswer = undefined;
  listeners.forEach((listener) => listener());
};

export const resolveConsent = (
  setting: "ask" | "always" | "never" | undefined,
  session: "allowed" | "denied" | undefined,
): TailscaleConsent => (setting === "always" ? "allowed" : setting === "never" ? "denied" : (session ?? "ask"));

export const useTailscaleConsent = (): {
  consent: TailscaleConsent;
  /** `remember` writes the answer to Settings; otherwise it lasts the session. */
  answer: (allow: boolean, remember: boolean) => void;
} => {
  const { settings, setSettings } = useSettings();
  const session = useSyncExternalStore(subscribe, () => sessionAnswer, () => undefined);
  return {
    // A browser build has no CLI to run, so there is nothing to ask about.
    consent: doctorAvailable() ? resolveConsent(settings.systemTailscale, session) : "denied",
    answer: (allow, remember) => {
      sessionAnswer = allow ? "allowed" : "denied";
      listeners.forEach((listener) => listener());
      if (remember) setSettings({ ...settings, systemTailscale: allow ? "always" : "never" });
    },
  };
};

/** How often the Tailscale CLI is asked again. */
export const TAILSCALE_REFRESH_MS = 60_000;

/**
 * The Tailscale CLI spawns a process per call, so its answer is shared by
 * every caller in the window and asked at most once per refresh.
 */
let cache: { at: number; result: Promise<MeshProbeResult | undefined> } | undefined;

export const probeTailscale = (): Promise<MeshProbeResult | undefined> => {
  const bridge = doctorBridge();
  if (!bridge) return Promise.resolve(undefined);
  const now = Date.now();
  if (!cache || now - cache.at > TAILSCALE_REFRESH_MS) {
    cache = { at: now, result: bridge.probeMesh().catch(() => undefined) };
  }
  return cache.result;
};

/**
 * The system Tailscale's status, when there is a reason to want it (`wanted`:
 * some address looks like a tailnet's) and the user has allowed asking.
 * Undefined until both hold — never a guess.
 */
export const useSystemTailscale = (
  wanted: boolean,
): { status: MeshProbeResult | undefined; consent: TailscaleConsent; answer: (allow: boolean, remember: boolean) => void } => {
  const { consent, answer } = useTailscaleConsent();
  const [status, setStatus] = useState<MeshProbeResult | undefined>();
  const run = wanted && consent === "allowed";

  useEffect(() => {
    if (!run) {
      setStatus(undefined);
      return;
    }
    let live = true;
    const refresh = () => void probeTailscale().then((next) => live && setStatus(next));
    refresh();
    const timer = window.setInterval(refresh, TAILSCALE_REFRESH_MS);
    window.addEventListener("focus", refresh);
    return () => {
      live = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, [run]);

  return { status, consent, answer };
};
