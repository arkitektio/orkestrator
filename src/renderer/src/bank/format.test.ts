import { describe, expect, it } from "vitest";
import { dominantCurrency } from "./components/charts/currency";
import { firstOfMonth, formatIban, formatMoney, intervalLabel, isoDay, toNumber } from "./format";

describe("bank format", () => {
  it("keeps Decimal strings exact until display", () => {
    expect(toNumber("-12.50")).toBe(-12.5);
    expect(toNumber(null)).toBe(0);
    expect(toNumber("nope")).toBe(0);
  });

  it("formats money with an explicit sign only when asked", () => {
    expect(formatMoney("12.5", "EUR", { signed: true })).toMatch(/^\+/);
    expect(formatMoney("-12.5", "EUR", { absolute: true })).not.toMatch(/-/);
    // An unknown currency code still prints, with the code appended.
    expect(formatMoney("1", "XYZ1")).toContain("XYZ1");
  });

  it("builds local Date scalars", () => {
    expect(isoDay(new Date(2026, 0, 5))).toBe("2026-01-05");
    expect(firstOfMonth(new Date(2026, 2, 17), 3)).toBe("2025-12-01");
  });

  it("groups an IBAN in fours", () => {
    expect(formatIban("AT611904300234573201")).toBe("AT61 1904 3002 3457 3201");
  });

  it("names the detected intervals", () => {
    expect(intervalLabel(30)).toBe("Monthly");
    expect(intervalLabel(10)).toBe("Every 10 days");
  });

  it("picks the currency most transactions are in", () => {
    expect(
      dominantCurrency([
        { currency: "USD", count: 2 },
        { currency: "EUR", count: 5 },
        { currency: "USD", count: 1 },
      ]),
    ).toBe("EUR");
    expect(dominantCurrency([])).toBeUndefined();
  });
});
