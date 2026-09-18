import { describe, expect, it } from "vitest";
import {
  durationToMs,
  frequencyToHz,
  timeUnitToMs,
} from "./timeUnits";

describe("timeUnitToMs", () => {
  it("accepts symbols and pint's spelled-out names", () => {
    expect(timeUnitToMs("ms")).toBe(1);
    expect(timeUnitToMs("millisecond")).toBe(1);
    expect(timeUnitToMs("second")).toBe(1000);
    expect(timeUnitToMs("s")).toBe(1000);
    expect(timeUnitToMs("µs")).toBe(1e-3);
    expect(timeUnitToMs("us")).toBe(1e-3);
  });

  it("refuses what it does not know, instead of guessing", () => {
    // A guessed unit is a silent 1000× error.
    expect(timeUnitToMs("furlong")).toBeNull();
    expect(timeUnitToMs("mV")).toBeNull();
    expect(timeUnitToMs(null)).toBeNull();
  });
});

describe("durationToMs / frequencyToHz", () => {
  it("parses wire strings", () => {
    expect(durationToMs("0.5 s")).toBe(500);
    expect(durationToMs("100 ms")).toBe(100);
    expect(frequencyToHz("10 kHz")).toBe(10_000);
    expect(frequencyToHz("250 Hz")).toBe(250);
  });

  it("refuses a bare number, which carries no unit to trust", () => {
    expect(durationToMs("100")).toBeNull();
    expect(frequencyToHz("100")).toBeNull();
  });
});
