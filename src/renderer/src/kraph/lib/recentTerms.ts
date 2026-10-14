import { Arkitekt } from "@/core/connection/arkitekt/host";
import React from "react";
import { z } from "zod";

/**
 * The words you last measured something as, so the next "Measures" is one
 * click: the smart menu's Measures section offers them as rows, the term
 * lookup lists them first.
 *
 * Scoped per profile, like the palette's recents (`core/command/recents.ts`)
 * and the menu's pins (`core/smart/extensions/pins.ts`): a word is the
 * organization's, and another organization may not speak it. Read through a
 * schema, so a hand-edited or version-skewed entry drops that row, not the list.
 */

export const RecentTermSchema = z.object({
  key: z.string().min(1),
  label: z.string().nullish(),
  color: z.array(z.number()).nullish(),
  at: z.number(),
});

export type RecentTerm = z.infer<typeof RecentTermSchema>;

export const MAX_RECENT_TERMS = 8;

export const recentTermsStorageKey = (profileId: string | null): string =>
  `orkestrator:kraph-recent-terms:v1:${profileId ?? "guest"}`;

export const loadRecentTerms = (
  profileId: string | null,
  storage: Storage = localStorage,
): RecentTerm[] => {
  try {
    const raw = storage.getItem(recentTermsStorageKey(profileId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((candidate) => {
      const result = RecentTermSchema.safeParse(candidate);
      return result.success ? [result.data] : [];
    });
  } catch {
    // Blocked storage or a corrupt entry: recents are a convenience.
    return [];
  }
};

export const saveRecentTerms = (
  profileId: string | null,
  terms: readonly RecentTerm[],
  storage: Storage = localStorage,
): void => {
  try {
    storage.setItem(recentTermsStorageKey(profileId), JSON.stringify(terms));
  } catch {
    // Quota or blocked storage; the recent still holds for this session.
  }
};

/** Most recent first, one row per word, capped. Pure — the caller persists. */
export const addRecentTerm = (
  current: readonly RecentTerm[],
  term: RecentTerm,
): RecentTerm[] =>
  [term, ...current.filter((recent) => recent.key !== term.key)].slice(0, MAX_RECENT_TERMS);

// One snapshot per storage key, so every open menu and dialog sees a new
// recent and `useSyncExternalStore` gets a stable reference between changes.
const cache = new Map<string, readonly RecentTerm[]>();
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((listener) => listener());

const snapshot = (profileId: string | null): readonly RecentTerm[] => {
  const key = recentTermsStorageKey(profileId);
  let terms = cache.get(key);
  if (!terms) {
    terms = loadRecentTerms(profileId);
    cache.set(key, terms);
  }
  return terms;
};

// Another window of the app measured something: it shares this localStorage.
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

export const recordRecentTerm = (
  profileId: string | null,
  term: Omit<RecentTerm, "at">,
): void => {
  const next = addRecentTerm(snapshot(profileId), { ...term, at: Date.now() });
  cache.set(recentTermsStorageKey(profileId), next);
  saveRecentTerms(profileId, next);
  emit();
};

/** For tests: forget what was read, so the next read hits storage again. */
export const resetRecentTermsCache = () => {
  cache.clear();
  emit();
};

/** The active profile's recent words, and a way to add one. */
export const useRecentTerms = () => {
  const profileId = Arkitekt.useActiveProfileId();
  const terms = React.useSyncExternalStore(subscribe, () => snapshot(profileId));
  const record = React.useCallback(
    (term: Omit<RecentTerm, "at">) => recordRecentTerm(profileId, term),
    [profileId],
  );
  return { terms, record };
};
