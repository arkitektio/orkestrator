/**
 * The palette's shared matcher — fuzzy, and ranked.
 *
 * `<Command shouldFilter={false}>` in `Menu.tsx` means cmdk does no filtering or
 * ranking at all — every source filters itself, because several of them filter
 * server-side. This is the one implementation the client-side sources share.
 *
 * Tokens are AND-ed, so "mikro fold" finds "Mikro / Folders" — matching how
 * people actually type into a palette. Each token is scored against each PART
 * on its own (never against the parts joined, so a token cannot straddle a
 * boundary), and the best tier wins:
 *
 *   exact part > part prefix > word prefix > substring
 *     > subsequence ("arrdat" → Array Datasets) > one typo ("taks" → Tasks)
 *
 * Earlier parts weigh more — callers put the label first, then the route or
 * description, then keywords — so an exact label always beats a keyword hit.
 * Short tokens stay strict: subsequences need three letters, typos four, so
 * "pdo" does not find Pods and "tks" does not find Tasks by accident.
 */

export type FilterParts = readonly (string | undefined | null)[];

const TIER_EXACT = 1;
const TIER_PREFIX = 0.9;
const TIER_WORD_START = 0.8;
const TIER_SUBSTRING = 0.6;
/** Ceiling for a subsequence hit; scaled down by how much had to be skipped. */
const TIER_SUBSEQUENCE = 0.4;
const TIER_TYPO = 0.3;
const TIER_PREFIX_TYPO = 0.25;

const SUBSEQUENCE_MIN_LEN = 3;
const TYPO_MIN_LEN = 4;
const PREFIX_TYPO_MIN_LEN = 5;

/** label/title, then route/description, then module label, then keywords. */
const PART_WEIGHTS = [1, 0.85, 0.7];
const TRAILING_PART_WEIGHT = 0.6;
const partWeight = (index: number): number => PART_WEIGHTS[index] ?? TRAILING_PART_WEIGHT;

const tokenize = (filter: string | undefined): string[] =>
  (filter ?? "").toLowerCase().split(/\s+/).filter(Boolean);

const WORD_SPLIT = /[^\p{L}\p{N}]+/u;
const WORD_CHAR = /[\p{L}\p{N}]/u;
const wordsOf = (part: string): string[] => part.split(WORD_SPLIT).filter(Boolean);
const isWordStart = (part: string, i: number): boolean => i === 0 || !WORD_CHAR.test(part[i - 1]);

/** Damerau–Levenshtein distance ≤ 1 (one insert, delete, substitute or swap), in O(n). */
const withinOneEdit = (a: string, b: string): boolean => {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;

  if (a.length === b.length) {
    const mismatches: number[] = [];
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) mismatches.push(i);
      if (mismatches.length > 2) return false;
    }
    if (mismatches.length === 1) return true;
    const [i, j] = mismatches;
    return j === i + 1 && a[i] === b[j] && a[j] === b[i];
  }

  const [long, short] = a.length > b.length ? [a, b] : [b, a];
  let i = 0;
  while (i < short.length && long[i] === short[i]) i++;
  return long.slice(i + 1) === short.slice(i);
};

/**
 * Cheapest way to read `token` out of `part` in order, or `null`.
 *
 * A jump to the start of a later word costs 1 however far it is — that is what
 * makes abbreviations work ("sbr" → Solo BRoadcasts) — while skipping letters
 * inside a word costs one per letter, so scattered letters across long text
 * come out expensive and are rejected by the caller's cap.
 */
const subsequenceCost = (token: string, part: string): number | null => {
  let best: number | null = null;
  for (let start = part.indexOf(token[0]); start >= 0; start = part.indexOf(token[0], start + 1)) {
    let cost = 0;
    let pos = start;
    let ok = true;
    for (let k = 1; k < token.length; k++) {
      const next = part.indexOf(token[k], pos + 1);
      if (next < 0) {
        ok = false;
        break;
      }
      const skipped = next - pos - 1;
      if (skipped > 0) cost += isWordStart(part, next) ? 1 : skipped;
      pos = next;
    }
    if (ok && (best === null || cost < best)) best = cost;
  }
  return best;
};

/** `part` is already lowercased. */
const scoreTokenInPart = (token: string, part: string): number => {
  if (part === token) return TIER_EXACT;
  if (part.startsWith(token)) return TIER_PREFIX;
  const words = wordsOf(part);
  if (words.some((w) => w.startsWith(token))) return TIER_WORD_START;
  if (part.includes(token)) return TIER_SUBSTRING;

  if (token.length >= SUBSEQUENCE_MIN_LEN) {
    const cost = subsequenceCost(token, part);
    if (cost !== null && cost <= Math.floor(token.length / 2)) {
      return (TIER_SUBSEQUENCE * token.length) / (token.length + cost);
    }
  }
  if (token.length >= TYPO_MIN_LEN) {
    if (words.some((w) => Math.abs(w.length - token.length) <= 1 && withinOneEdit(token, w))) {
      return TIER_TYPO;
    }
  }
  if (token.length >= PREFIX_TYPO_MIN_LEN) {
    if (words.some((w) => w.length > token.length && withinOneEdit(token, w.slice(0, token.length)))) {
      return TIER_PREFIX_TYPO;
    }
  }
  return 0;
};

/**
 * How well `parts` fit `filter`: 0 is no match, 1 is perfect; empty filter is 1.
 *
 * Every token must land somewhere (AND); the result is the product of each
 * token's best weighted hit, so one weak token drags a row down but does not
 * drop it.
 */
export const scoreFilter = (parts: FilterParts, filter: string | undefined): number => {
  const tokens = tokenize(filter);
  if (tokens.length === 0) return 1;

  const lowered = parts.map((p) => (p ? p.toLowerCase() : null));

  let score = 1;
  for (const token of tokens) {
    let best = 0;
    lowered.forEach((part, index) => {
      if (!part) return;
      const s = scoreTokenInPart(token, part) * partWeight(index);
      if (s > best) best = s;
    });
    if (best === 0) return 0;
    score *= best;
  }
  return score;
};

export const matchesFilter = (parts: FilterParts, filter: string | undefined): boolean =>
  scoreFilter(parts, filter) > 0;

/**
 * The items that fit `filter`, best first, capped at `limit`.
 *
 * With nothing typed, the items as given (in their own order) — a source that
 * shows everything at rest keeps doing so. Ties break towards the shorter
 * first part ("Dashboard" over "Dashboards" for "dash"), then original order.
 */
export const rankByFilter = <T>(
  items: readonly T[],
  partsOf: (item: T) => FilterParts,
  filter: string | undefined,
  limit = Infinity,
): T[] => {
  if (tokenize(filter).length === 0) return items.slice(0, limit);

  return items
    .map((item, index) => {
      const parts = partsOf(item);
      return { item, index, score: scoreFilter(parts, filter), labelLength: (parts[0] ?? "").length };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score || a.labelLength - b.labelLength || a.index - b.index)
    .slice(0, limit)
    .map((s) => s.item);
};
