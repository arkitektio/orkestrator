/**
 * Stats come back per currency. The charts draw one currency at a time: the
 * one most transactions are in, which for a household is the home currency.
 */
export const dominantCurrency = <T extends { currency: string; count: number }>(rows: readonly T[]) => {
  const counts = new Map<string, number>();
  for (const row of rows) counts.set(row.currency, (counts.get(row.currency) ?? 0) + row.count);
  let best: string | undefined;
  for (const [currency, count] of counts) if (best === undefined || count > counts.get(best)!) best = currency;
  return best;
};
