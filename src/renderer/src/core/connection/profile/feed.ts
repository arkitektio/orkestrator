import type { LucideIcon } from "lucide-react";
import type { ComponentType } from "react";

/**
 * A member's work across every service, newest first: the main column of
 * their profile. Each module answers for its own data with a `profileFeed`
 * builtin (sources); the host draws the search field, one toggle per kind,
 * merges what the sources found by creation time, and draws each source's own
 * card. Only a module whose backend can filter by creator and order by
 * creation time can take part.
 */

/** One kind of thing a module lists: a toggle in the feed's filter row. */
export type ProfileFeedKind = {
  /** `"<module>.<kind>"`, unique across modules: the URL names a toggle by it. */
  id: `${string}.${string}`;
  /** Plural, as the toggle reads: "Images", "Experiments". */
  label: string;
  /** Drawn on the toggle, as the other filter pills draw theirs. */
  icon: LucideIcon;
};

/** What the host asks a source for. */
export type ProfileFeedQuery = {
  /** The member: the lok user id, which IS the subject. */
  sub: string;
  /** Trimmed and settled; empty when nothing was typed. */
  search: string;
  /** This source's kinds that are on; never empty (a source with none is not mounted). */
  kinds: readonly string[];
  /** How many of the newest to return. */
  limit: number;
};

export type ProfileFeedResult<T> = {
  /**
   * Newest first, at most `limit`. The SAME array until the data changes (the
   * query's own, or a memo over it): the host reports it from an effect.
   */
  items: readonly T[];
  loading: boolean;
  error?: unknown;
};

export type ProfileFeedSource<T = any> = {
  /** `"<module>.<name>"`, e.g. `"mikro.data"`. */
  id: `${string}.${string}`;
  kinds: readonly ProfileFeedKind[];
  /** The source's query. Mounted inside its module's guard, only while one of its kinds is on. */
  useItems: (query: ProfileFeedQuery) => ProfileFeedResult<T>;
  /** Unique within the source. */
  itemKey: (item: T) => string;
  /** What the feed sorts by; an item without one sorts last. */
  createdAt: (item: T) => string | null | undefined;
  /** The item as a square card in the shared frame (`CardFrame`, `CARD_FRAME_SIZE`). */
  Card: ComponentType<{ item: T }>;
};

/** One card of the merged feed. */
export type ProfileFeedEntry<S extends { id: string } = ProfileFeedSource> = {
  key: string;
  source: S;
  item: unknown;
  at: number;
};

/**
 * Every source's items as one list, newest first, cut at `limit`. Correct as
 * long as each source returned its own newest `limit`: the overall newest
 * `limit` are among them. Ties keep source order, then the source's own order.
 */
export const mergeProfileFeed = <S extends Pick<ProfileFeedSource, "id" | "itemKey" | "createdAt">>(
  results: readonly { source: S; items: readonly unknown[] }[],
  limit: number,
): ProfileFeedEntry<S>[] => {
  const entries = results.flatMap(({ source, items }, sourceIndex) =>
    items.map((item, index) => {
      const created = source.createdAt(item);
      const at = created ? Date.parse(created) : Number.NaN;
      return {
        entry: {
          key: `${source.id}:${source.itemKey(item)}`,
          source,
          item,
          at: Number.isNaN(at) ? Number.NEGATIVE_INFINITY : at,
        },
        sourceIndex,
        index,
      };
    }),
  );
  entries.sort((a, b) => b.entry.at - a.entry.at || a.sourceIndex - b.sourceIndex || a.index - b.index);
  return entries.slice(0, limit).map(({ entry }) => entry);
};

/** Whether "Show more" can bring anything: some source filled what it was asked for. */
export const profileFeedHasMore = (results: readonly { items: readonly unknown[] }[], limit: number): boolean =>
  results.some(({ items }) => items.length >= limit);
