import { Arkitekt } from "@/app/Arkitekt";
import { smartRegistry } from "@/providers/smart/registry";
import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";

import {
  activePinKey,
  addPin,
  isPinned,
  loadPins,
  movePin,
  pinKey,
  removePin,
  routeOfPin,
  savePins,
  type Pin,
  type PinState,
} from "./pins";

/**
 * The pinned routes down the left of the rail.
 *
 * The router stays the source of truth for what is *displayed*; this owns only
 * the list. That split is what lets a pin open a real detail page without an
 * `identifier -> component` registry (the smart adapters render a page from a
 * fetched object, not from an id), and it means a navigation from anywhere at
 * all highlights the right pin without those call sites knowing pins exist.
 */

export type PinsValue = {
  pins: Pin[];
  activeKey: string | undefined;
  /** Is the thing currently on screen already pinned? */
  isCurrentPinned: boolean;
  /**
   * Whether pinning is possible at all — false when signed out.
   *
   * Pins belong to a membership, so with none there is nothing to attach them
   * to. Every surface that offers pinning reads this instead of inventing its
   * own check, so the affordance and the action can never disagree.
   */
  canPin: boolean;
  pin: (pin: Pin) => void;
  unpin: (key: string) => void;
  move: (key: string, toIndex: number) => void;
  select: (key: string) => void;
  pathOf: (pin: Pin) => string | undefined;
};

const noop = () => {};

const PinsContext = createContext<PinsValue>({
  pins: [],
  activeKey: undefined,
  isCurrentPinned: false,
  canPin: false,
  pin: noop,
  unpin: noop,
  move: noop,
  select: noop,
  pathOf: () => undefined,
});

export const usePins = () => useContext(PinsContext);

const buildModelPath = (identifier: string, id: string) =>
  smartRegistry.buildModelPath(identifier, id);

export const PinsProvider = ({ children }: { children: React.ReactNode }) => {
  const profileId = Arkitekt.useActiveProfileId();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // Read once, lazily. No effect is needed to follow the organization: pins hold
  // tenant-scoped entity ids, and `ProfileScope` in `AppProvider` already keys
  // this whole subtree on the active profile, so a switch remounts the provider
  // and it re-reads that profile's pins on the way in.
  const [state, setState] = useState<PinState>(() => loadPins(profileId));

  // Which pin the user last clicked. Needed because two pins can point at the
  // same page — a route pin for `/mikro/arraydatasets/5` and an entity pin for
  // that dataset — and nothing in the URL distinguishes them. Deliberately a
  // HINT, not the source of truth: it only ever breaks a tie among pins that
  // already match the current path, so navigating away by any other means still
  // moves the highlight.
  const [selectedKey, setSelectedKey] = useState<string | undefined>(undefined);

  const update = useCallback(
    (fn: (current: PinState) => PinState) => {
      setState((current) => {
        const next = fn(current);
        savePins(profileId, next);
        return next;
      });
    },
    [profileId],
  );

  const pathOf = useCallback((pin: Pin) => routeOfPin(pin, buildModelPath), []);

  // Signed out there is no membership to attach a pin to, so this refuses
  // rather than writing somewhere that belongs to nobody. Guarded here as well
  // as in the UI, because ⌘T and the palette reach it without going near the
  // rail's affordance.
  const canPin = Boolean(profileId);

  const pin = useCallback<PinsValue["pin"]>(
    (entry) => {
      if (!canPin) return;
      update((current) => addPin(current, entry));
    },
    [update, canPin],
  );

  const unpin = useCallback(
    (key: string) => {
      // Otherwise the hint outlives the pin and could resurrect it as the
      // highlight if an identical one were pinned again.
      setSelectedKey((current) => (current === key ? undefined : current));
      update((current) => removePin(current, key));
    },
    [update],
  );

  const move = useCallback(
    (key: string, toIndex: number) => update((current) => movePin(current, key, toIndex)),
    [update],
  );

  const select = useCallback(
    (key: string) => {
      const entry = state.pins.find((p) => pinKey(p) === key);
      const to = entry && routeOfPin(entry, buildModelPath);
      // A pin whose model is no longer registered — a module dropped from the
      // deployment — has no path; do nothing rather than go to `/undefined`.
      if (!to) return;
      setSelectedKey(key);
      navigate(to);
    },
    [state.pins, navigate],
  );

  const activeKey = useMemo(
    () => activePinKey(state.pins, pathname, buildModelPath, selectedKey),
    [state.pins, pathname, selectedKey],
  );

  const isCurrentPinned = useMemo(
    () => isPinned(state, `route:${pathname}`) || activeKey !== undefined,
    [state, pathname, activeKey],
  );

  const value = useMemo<PinsValue>(
    () => ({
      pins: state.pins,
      activeKey,
      isCurrentPinned,
      canPin,
      pin,
      unpin,
      move,
      select,
      pathOf,
    }),
    [state.pins, activeKey, isCurrentPinned, canPin, pin, unpin, move, select, pathOf],
  );

  return <PinsContext.Provider value={value}>{children}</PinsContext.Provider>;
};

export default PinsProvider;
