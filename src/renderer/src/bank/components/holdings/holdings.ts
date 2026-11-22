import { toNumber } from "../../format";

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

/** The server's positions, summed by ISIN and currency across depots (`mergedPositions`). */
export type MergedPositionLike = {
  isin: string;
  name: string;
  securityType?: string | null;
  currency: string;
  quantity: string;
  price?: string | null;
  fifoPrice?: string | null;
  valuation: string;
  unrealizedGain?: string | null;
  weight: number;
};

/**
 * The server's merged positions as display numbers. The sums, FIFO prices,
 * gains and weights were worked out there in exact decimals.
 */
export const positionsOf = (merged: readonly MergedPositionLike[]): Position[] =>
  merged.map((p) => ({
    isin: p.isin,
    name: p.name,
    securityType: p.securityType ?? null,
    currency: p.currency,
    quantity: toNumber(p.quantity),
    price: p.price != null ? toNumber(p.price) : null,
    fifoPrice: p.fifoPrice != null ? toNumber(p.fifoPrice) : null,
    valuation: toNumber(p.valuation),
    gain: p.unrealizedGain != null ? toNumber(p.unrealizedGain) : null,
    weight: p.weight,
  }));

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
