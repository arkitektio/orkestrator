/**
 * The palette's shared matcher.
 *
 * `<Command shouldFilter={false}>` in `Menu.tsx` means cmdk does no filtering at
 * all — every source filters itself, because several of them filter server-side.
 * Today each does it ad hoc; this is the one implementation the client-side
 * sources share.
 *
 * Tokens are AND-ed, so "mikro fold" finds "Mikro / Folders" — matching how
 * people actually type into a palette, rather than requiring one contiguous
 * substring.
 */
export const matchesFilter = (
  parts: (string | undefined | null)[],
  filter: string | undefined,
): boolean => {
  const tokens = (filter ?? "").toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) {
    return true;
  }

  const haystack = parts.filter(Boolean).join(" ").toLowerCase();
  return tokens.every((token) => haystack.includes(token));
};
