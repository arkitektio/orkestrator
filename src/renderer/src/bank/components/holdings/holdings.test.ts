import { describe, expect, it } from "vitest";
import { aggregatePositions, allocationByType, positionsOf, summarize } from "./holdings";

const etf = { isin: "IE00B4L5Y983", name: "MSCI World", securityType: "ETF", currency: "EUR" };

describe("aggregatePositions", () => {
  it("merges one security across depots and weights the buy-in", () => {
    const [row] = aggregatePositions([
      { ...etf, quantity: "10", fifoPrice: "80", price: "100", valuation: "1000", unrealizedGain: "200" },
      { ...etf, quantity: "30", fifoPrice: "90", price: "100", valuation: "3000", unrealizedGain: "300" },
    ]);
    expect(row.quantity).toBe(40);
    expect(row.valuation).toBe(4000);
    expect(row.gain).toBe(500);
    expect(row.fifoPrice).toBeCloseTo(87.5);
    expect(row.weight).toBe(1);
  });

  it("drops the gain when any lot has no buy-in", () => {
    const [row] = aggregatePositions([
      { ...etf, quantity: "1", fifoPrice: "80", valuation: "100", unrealizedGain: "20" },
      { ...etf, quantity: "1", fifoPrice: null, valuation: "100", unrealizedGain: null },
    ]);
    expect(row.gain).toBeNull();
    expect(row.fifoPrice).toBeNull();
  });

  it("sorts by value and weighs within a currency", () => {
    const rows = aggregatePositions([
      { ...etf, quantity: "1", valuation: "100" },
      { isin: "US0378331005", name: "Apple", securityType: "STOCK", currency: "EUR", quantity: "1", valuation: "300" },
    ]);
    expect(rows.map((r) => r.name)).toEqual(["Apple", "MSCI World"]);
    expect(rows[0].weight).toBe(0.75);
    expect(allocationByType(rows, "EUR")).toEqual([
      { type: "STOCK", valuation: 300, weight: 0.75 },
      { type: "ETF", valuation: 100, weight: 0.25 },
    ]);
  });
});

describe("summarize", () => {
  it("reports gain against cost", () => {
    const [summary] = summarize(
      aggregatePositions([{ ...etf, quantity: "10", fifoPrice: "80", valuation: "1000", unrealizedGain: "200" }]),
    );
    expect(summary.valuation).toBe(1000);
    expect(summary.gain).toBe(200);
    expect(summary.gainRatio).toBeCloseTo(0.25);
  });
});

describe("positionsOf", () => {
  it("reads the server's merged positions as display numbers, keeping unknown gains unknown", () => {
    const [etf, gift] = positionsOf([
      {
        isin: "IE00B4L5Y983",
        name: "World ETF",
        securityType: "ETF",
        currency: "EUR",
        quantity: "12.5",
        price: "80.10",
        fifoPrice: "70.00",
        valuation: "1001.25",
        unrealizedGain: "126.25",
        weight: 0.8,
      },
      { isin: "DE0007164600", name: "Gift", currency: "EUR", quantity: "1", valuation: "250", weight: 0.2 },
    ]);
    expect(etf).toMatchObject({ quantity: 12.5, fifoPrice: 70, valuation: 1001.25, gain: 126.25, weight: 0.8 });
    expect(gift).toMatchObject({ securityType: null, price: null, fifoPrice: null, gain: null, weight: 0.2 });
  });
});
