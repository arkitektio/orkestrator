import { z } from "zod";

/**
 * What the palette shows before you type anything.
 *
 * Scoped per profile, and that is not a nicety: entity ids are tenant-scoped, so
 * a recent from one organization navigates the next one to a 404 or a permission
 * error. The profile id comes from the profile book (`Arkitekt.useActiveProfileId`).
 *
 * Read through a schema, like the other localStorage in this codebase
 * (`fakts/profileStorageSchema.ts`): a hand-edited or version-skewed entry must
 * degrade to an empty list, never crash the palette.
 */

export const RecentEntrySchema = z.union([
  z.object({
    kind: z.literal("entity"),
    identifier: z.string(),
    id: z.string(),
    label: z.string(),
    at: z.number(),
  }),
  z.object({
    kind: z.literal("route"),
    route: z.string(),
    label: z.string(),
    at: z.number(),
  }),
]);

export type RecentEntry = z.infer<typeof RecentEntrySchema>;

export const MAX_RECENTS = 20;

export const recentsStorageKey = (profileId: string | null): string =>
  `orkestrator:recents:v1:${profileId ?? "guest"}`;

/** Identity for de-duplication: the same thing visited twice is one entry. */
const keyOf = (entry: RecentEntry): string =>
  entry.kind === "entity" ? `entity:${entry.identifier}:${entry.id}` : `route:${entry.route}`;

export const loadRecents = (
  profileId: string | null,
  storage: Storage = localStorage,
): RecentEntry[] => {
  let raw: string | null = null;
  try {
    raw = storage.getItem(recentsStorageKey(profileId));
  } catch {
    // Private mode, blocked site data — recents are a convenience, not state
    // worth failing over.
    return [];
  }
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Entry by entry: one bad row must not empty the whole list.
    return parsed.flatMap((candidate) => {
      const result = RecentEntrySchema.safeParse(candidate);
      return result.success ? [result.data] : [];
    });
  } catch {
    return [];
  }
};

/** Most recent first, deduped, capped. Pure — the caller persists the result. */
export const addRecent = (
  current: RecentEntry[],
  entry: RecentEntry,
): RecentEntry[] =>
  [entry, ...current.filter((e) => keyOf(e) !== keyOf(entry))].slice(0, MAX_RECENTS);

export const saveRecents = (
  profileId: string | null,
  entries: RecentEntry[],
  storage: Storage = localStorage,
): void => {
  try {
    storage.setItem(recentsStorageKey(profileId), JSON.stringify(entries));
  } catch {
    // Quota or blocked storage; silently skip, as above.
  }
};

export const recordRecent = (
  profileId: string | null,
  entry: RecentEntry,
  storage: Storage = localStorage,
): RecentEntry[] => {
  const next = addRecent(loadRecents(profileId, storage), entry);
  saveRecents(profileId, next, storage);
  return next;
};
