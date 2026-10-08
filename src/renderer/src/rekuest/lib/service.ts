const count = (number: number, word: string) => `${number} ${word}${number === 1 ? "" : "s"}`;

/** "3 signals · 5 structures"; what a service declares none of is left out. */
export const describeService = (declares: { signals: number; structures: number }) =>
  [
    declares.signals > 0 && count(declares.signals, "signal"),
    declares.structures > 0 && count(declares.structures, "structure"),
  ]
    .filter(Boolean)
    .join(" · ");

/** Every word of `text` appears somewhere in `parts`. An empty search matches. */
export const matchesWords = (
  text: string,
  parts: readonly (string | null | undefined)[],
): boolean => {
  const terms = text.toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return true;
  const haystack = parts.filter(Boolean).join(" ").toLowerCase();
  return terms.every((term) => haystack.includes(term));
};
