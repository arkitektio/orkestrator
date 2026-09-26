import { toNumber } from "../../format";

export type HoldingLike = {
  isin: string;
  name: string;
  securityType?: string | null;
  quantity: string;
  fifoPrice?: string | null;
  price?: string | null;
  valuation: string;
  currency: string;
  unrealizedGain?: string | null;
};

/** One security across however many depots hold it. Numbers, for display only. */
export type Position = {
  isin: string;
  name: string;
  securityType: string | null;
  currency: string;
  quantity: number;
  price: number | null;
  /** Quantity-weighted buy-in per unit, where every lot reported one. */
  fifoPrice: number | null;
  valuation: number;
  /** Null when any lot has no buy-in (e.g. transferred in). */
  gain: number | null;
  /** Share of the portfolio's value in the same currency, 0..1. */
  weight: number;
};

/**
 * Sums positions by ISIN and currency, largest first. The same ETF in two
 * depots is one line; its gain is only known if every lot's is.
 */
export const aggregatePositions = (holdings: readonly HoldingLike[]): Position[] => {
  const byKey = new Map<string, Position & { cost: number | null }>();
  for (const h of holdings) {
    const key = `${h.isin}|${h.currency}`;
    const quantity = toNumber(h.quantity);
    const cost = h.fifoPrice != null ? toNumber(h.fifoPrice) * quantity : null;
    const gain = h.unrealizedGain != null ? toNumber(h.unrealizedGain) : null;
    const row = byKey.get(key);
    if (!row) {
      byKey.set(key, {
        isin: h.isin,
        name: h.name,
        securityType: h.securityType ?? null,
        currency: h.currency,
        quantity,
        price: h.price != null ? toNumber(h.price) : null,
        fifoPrice: null,
        valuation: toNumber(h.valuation),
        gain,
        cost,
        weight: 0,
      });
      continue;
    }
    row.quantity += quantity;
    row.valuation += toNumber(h.valuation);
    row.gain = row.gain != null && gain != null ? row.gain + gain : null;
    row.cost = row.cost != null && cost != null ? row.cost + cost : null;
    row.price ??= h.price != null ? toNumber(h.price) : null;
  }

  const totals = new Map<string, number>();
  for (const row of byKey.values()) totals.set(row.currency, (totals.get(row.currency) ?? 0) + row.valuation);

  return [...byKey.values()]
    .map(({ cost, ...row }) => ({
      ...row,
      fifoPrice: cost != null && row.quantity > 0 ? cost / row.quantity : null,
      weight: totals.get(row.currency) ? row.valuation / totals.get(row.currency)! : 0,
    }))
    .sort((a, b) => b.valuation - a.valuation);
};

export type PortfolioSummary = {
  currency: string;
  valuation: number;
  /** Null when no position reports a gain. */
  gain: number | null;
  /** gain / cost of the positions that report one. */
  gainRatio: number | null;
};

export const summarize = (positions: readonly Position[]): PortfolioSummary[] => {
  const byCurrency = new Map<string, { valuation: number; gain: number; cost: number; known: boolean }>();
  for (const p of positions) {
    const row = byCurrency.get(p.currency) ?? { valuation: 0, gain: 0, cost: 0, known: false };
    row.valuation += p.valuation;
    if (p.gain != null) {
      row.gain += p.gain;
      row.cost += p.valuation - p.gain;
      row.known = true;
    }
    byCurrency.set(p.currency, row);
  }
  return [...byCurrency.entries()].map(([currency, row]) => ({
    currency,
    valuation: row.valuation,
    gain: row.known ? row.gain : null,
    gainRatio: row.known && row.cost > 0 ? row.gain / row.cost : null,
  }));
};

/** Value per security type ("ETF", "STOCK", …), largest first, within one currency. */
export const allocationByType = (positions: readonly Position[], currency: string) => {
  const byType = new Map<string, number>();
  for (const p of positions) {
    if (p.currency !== currency) continue;
    const type = p.securityType || "OTHER";
    byType.set(type, (byType.get(type) ?? 0) + p.valuation);
  }
  const total = [...byType.values()].reduce((a, b) => a + b, 0);
  return [...byType.entries()]
    .map(([type, valuation]) => ({ type, valuation, weight: total ? valuation / total : 0 }))
    .sort((a, b) => b.valuation - a.valuation);
};
