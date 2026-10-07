import { Arkitekt } from "@/core/connection/arkitekt/host";
import React from "react";
import { z } from "zod";
import type { SectionPins, SmartSectionId } from "./section";

/**
 * Which rows of the smart context menu the user pinned to the start of
 * the list.
 *
 * One list for every section, keyed `<section id>:<item key>`, in the order
 * things were pinned. Scoped per profile, like the palette's recents
 * (`core/command/recents.ts`): a server-side row is keyed by an id that only
 * means something inside its organization.
 *
 * A pin never decides whether a row exists. The section's own query still
 * says what applies to the selection; a pin only lifts a row it returned.
 */

const PinsSchema = z.array(z.string());

export const smartPinsStorageKey = (profileId: string | null): string =>
  `orkestrator:smart-pins:v1:${profileId ?? "guest"}`;

export const pinKey = (sectionId: SmartSectionId, itemKey: string): string =>
  `${sectionId}:${itemKey}`;

export const loadPins = (
  profileId: string | null,
  storage: Storage = localStorage,
): string[] => {
  try {
    const raw = storage.getItem(smartPinsStorageKey(profileId));
    if (!raw) return [];
    const result = PinsSchema.safeParse(JSON.parse(raw));
    return result.success ? [...new Set(result.data)] : [];
  } catch {
    // Blocked storage or a hand-edited entry: pins are a convenience.
    return [];
  }
};

export const savePins = (
  profileId: string | null,
  pins: readonly string[],
  storage: Storage = localStorage,
): void => {
  try {
    storage.setItem(smartPinsStorageKey(profileId), JSON.stringify(pins));
  } catch {
    // Quota or blocked storage; the pin still holds for this session.
  }
};

/** Pure: a new pin goes last, so the pinned rows keep their order. */
export const togglePin = (pins: readonly string[], key: string): string[] =>
  pins.includes(key) ? pins.filter((pin) => pin !== key) : [...pins, key];

// One snapshot per storage key, so every open menu sees a toggle and
// `useSyncExternalStore` gets a stable reference between changes.
const cache = new Map<string, readonly string[]>();
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((listener) => listener());

const snapshot = (profileId: string | null): readonly string[] => {
  const key = smartPinsStorageKey(profileId);
  let pins = cache.get(key);
  if (!pins) {
    pins = loadPins(profileId);
    cache.set(key, pins);
  }
  return pins;
};

// Another window of the app pinned something: it shares this localStorage.
const onStorage = (event: StorageEvent) => {
  if (event.key === null) cache.clear();
  else if (!cache.delete(event.key)) return;
  emit();
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  if (listeners.size === 1) window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener("storage", onStorage);
  };
};

export const toggleSmartPin = (profileId: string | null, key: string): void => {
  const next = togglePin(snapshot(profileId), key);
  cache.set(smartPinsStorageKey(profileId), next);
  savePins(profileId, next);
  emit();
};

/** For tests: forget what was read, so the next read hits storage again. */
export const resetSmartPinsCache = () => {
  cache.clear();
  emit();
};

/** The host's pins for one section; a section may bring its own (`usePins`). */
export const useSmartPins = (sectionId: SmartSectionId): SectionPins => {
  const profileId = Arkitekt.useActiveProfileId();
  const pins = React.useSyncExternalStore(subscribe, () => snapshot(profileId));

  return React.useMemo(() => {
    const index = new Map(pins.map((pin, position) => [pin, position]));
    return {
      isPinned: (itemKey) => index.has(pinKey(sectionId, itemKey)),
      toggle: (itemKey) => toggleSmartPin(profileId, pinKey(sectionId, itemKey)),
      order: (itemKey) => index.get(pinKey(sectionId, itemKey)) ?? Number.MAX_SAFE_INTEGER,
    };
  }, [pins, profileId, sectionId]);
};
