// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { ColorMap } from "@/mikro/api/graphql";
import {
  CODE_HIDDEN,
  CODE_NO_VALUE,
  VALUE_CODE_MAX,
  allocateValueLut,
  decodeValue,
  encodeValue,
  paintValueLut,
  valueLutTexels,
} from "./valueLut";

const identity = (objectId: number) => objectId;

describe("the 16-bit code", () => {
  it("packs G high, R low — the order the shader decodes", () => {
    // The one thing here that fails SILENTLY if it is wrong: a reversed pair is
    // a plausible number, not an error. The shader reads `G * 256 + R`, so the
    // low byte must land in R, which is byte 0 of the pair.
    const lut = allocateValueLut(4);
    lut.view[0] = 0x1234;
    expect(lut.data[0]).toBe(0x34); // R, low
    expect(lut.data[1]).toBe(0x12); // G, high
    expect(lut.data[1] * 256 + lut.data[0]).toBe(0x1234);
  });

  it("round-trips a value through the quantisation", () => {
    for (const [value, min, max] of [
      [0, 0, 10],
      [10, 0, 10],
      [3.7, 0, 10],
      [-5, -5, 5],
    ] as const) {
      const back = decodeValue(encodeValue(value, min, max), min, max);
      expect(Math.abs(back - value)).toBeLessThan((max - min) / VALUE_CODE_MAX + 1e-9);
    }
  });

  it("keeps 16 bits of precision, which is why it is not one byte", () => {
    // Counts 0..200 windowed to 0..5 is the case 8 bits would band: it would
    // leave ~6 distinct levels across the window. Here the codes stay distinct.
    const codes = new Set<number>();
    for (let value = 0; value <= 5; value += 0.1) codes.add(encodeValue(value, 0, 200));
    expect(codes.size).toBeGreaterThan(40);
  });

  it("puts a constant column mid-range instead of dividing by zero", () => {
    expect(encodeValue(7, 7, 7)).toBe(Math.round(0.5 * VALUE_CODE_MAX));
  });
});

describe("paintValueLut", () => {
  it("starts every slot visible-with-no-value, and reports the data range", () => {
    const lut = allocateValueLut(5);
    expect([...lut.view]).toEqual(Array(5).fill(CODE_NO_VALUE));

    const window = paintValueLut({
      lut,
      slotOf: identity,
      colorBy: { table: "t", column: "expr", colormap: ColorMap.Viridis },
      filterBys: [],
      colorValues: new Map<number, unknown>([
        [1, 0],
        [3, 20],
      ]),
      ruleValues: [],
    });

    // The window is the DATA's range, never a clim — the clim is a uniform.
    expect(window).toEqual({ valueMin: 0, valueMax: 20 });
    expect(lut.view[1]).toBe(0);
    expect(lut.view[3]).toBe(VALUE_CODE_MAX);
    expect(lut.view[2]).toBe(CODE_NO_VALUE); // no row -> keeps its hue hash
  });

  it("ignores the entry's clims when quantising", () => {
    // The regression this guards: quantising to the window would make the table
    // unusable the moment the window moved, which is the whole point of the change.
    const lut = allocateValueLut(2);
    const window = paintValueLut({
      lut,
      slotOf: identity,
      colorBy: { table: "t", column: "expr", colormap: ColorMap.Viridis, min: 100, max: 200 },
      filterBys: [],
      colorValues: new Map<number, unknown>([
        [0, 0],
        [1, 10],
      ]),
      ruleValues: [],
    });
    expect(window).toEqual({ valueMin: 0, valueMax: 10 });
  });

  it("hides a filtered slot and leaves an unmentioned one at the baseline", () => {
    const lut = allocateValueLut(6);
    paintValueLut({
      lut,
      slotOf: identity,
      colorBy: null,
      filterBys: [{ table: "t", column: "area", min: 10 }],
      colorValues: null,
      ruleValues: [
        new Map<number, unknown>([
          [1, 50],
          [2, 5],
        ]),
      ],
    });
    expect(lut.view[1]).toBe(CODE_NO_VALUE); // kept
    expect(lut.view[2]).toBe(CODE_HIDDEN); // out of range
    expect(lut.view[4]).toBe(CODE_HIDDEN); // never mentioned -> the baseline
  });

  it("keeps a value on a kept slot while a rule hides its neighbour", () => {
    // The bug the shared 16-bit code invites: visibility and value live in the
    // same bits, so hiding by blanket-fill erased the values it was meant to
    // sit beside. Visibility is decided first and the value pass declines to
    // write into a hidden slot.
    const lut = allocateValueLut(4);
    paintValueLut({
      lut,
      slotOf: identity,
      colorBy: { table: "t", column: "expr", colormap: ColorMap.Viridis },
      filterBys: [{ table: "t", column: "area", min: 10 }],
      colorValues: new Map<number, unknown>([
        [1, 0],
        [2, 100],
      ]),
      ruleValues: [
        new Map<number, unknown>([
          [1, 50], // passes
          [2, 5], // fails
        ]),
      ],
    });
    expect(lut.view[1]).toBe(0); // kept, and carries its value
    expect(lut.view[2]).toBe(CODE_HIDDEN); // hidden, and stayed hidden
    expect(lut.view[3]).toBe(CODE_HIDDEN); // unmentioned -> the baseline
  });

  it("ranks a categorical colouring onto the palette row", () => {
    const lut = allocateValueLut(3);
    const window = paintValueLut({
      lut,
      slotOf: identity,
      colorBy: { table: "t", column: "kind", colormap: ColorMap.Distinct },
      filterBys: [],
      colorValues: new Map<number, unknown>([
        [0, "b"],
        [1, "a"],
        [2, "b"],
      ]),
      ruleValues: [],
    });
    // Normalised onto 0..1 so the shader keeps one path.
    expect(window).toEqual({ valueMin: 0, valueMax: 1 });
    expect(lut.view[0]).toBe(lut.view[2]); // same class, same code
    expect(lut.view[0]).not.toBe(lut.view[1]);
    // Sorted ranks, so the palette does not reshuffle between builds.
    expect(lut.view[1]).toBe(encodeValue(0.5 / 256, 0, 1));
  });

  it("halves the table against RGBA8 — which is what brings 2 um inside the budget", () => {
    const slots = 5_479_660;
    expect(valueLutTexels(slots) * 2).toBeLessThan(16 * 1024 * 1024);
    expect(valueLutTexels(slots) * 4).toBeGreaterThan(16 * 1024 * 1024);
  });
});

describe("paintValueLut — a SPARSE rule's absent objects", () => {
  // A sparse read answers with the NONZEROS. An object missing from it has
  // value 0, not "no value" — and the widest legal rule a picker can seed is
  // the slice's own range, which contains 0. Read the absent objects as "no
  // value" and switching that rule on hides every cell the ion was not
  // detected in, which is most of them.
  const sparseRule = (min: number, max: number) => ({
    dataset: "matrix-1",
    at: [{ axis: "ion", value: 3 }],
    min,
    max,
    exclude: false,
  });

  it("keeps an object the slice never mentions when the bound contains 0", () => {
    const lut = allocateValueLut(5);
    paintValueLut({
      lut,
      slotOf: identity,
      colorBy: null,
      filterBys: [sparseRule(0, 40)],
      colorValues: null,
      ruleValues: [new Map<number, unknown>([[1, 12]])],
    });
    expect(lut.view[1]).toBe(CODE_NO_VALUE); // in the band
    expect(lut.view[4]).toBe(CODE_NO_VALUE); // absent, so zero, so kept
  });

  it("drops the absent objects when the bound excludes 0", () => {
    const lut = allocateValueLut(5);
    paintValueLut({
      lut,
      slotOf: identity,
      colorBy: null,
      filterBys: [sparseRule(5, 40)],
      colorValues: null,
      ruleValues: [
        new Map<number, unknown>([
          [1, 12],
          [2, 1],
        ]),
      ],
    });
    expect(lut.view[1]).toBe(CODE_NO_VALUE); // detected and inside the band
    expect(lut.view[2]).toBe(CODE_HIDDEN); // detected but below it
    expect(lut.view[4]).toBe(CODE_HIDDEN); // absent -> zero -> below it
  });

  it("puts an id one rule omits to that rule as a zero, not as a miss", () => {
    // Two rules AND together, so the union path runs. Slot 2 is mentioned by
    // the column rule alone; the sparse rule still has to answer for it, and
    // its answer is about the value 0.
    const lut = allocateValueLut(4);
    paintValueLut({
      lut,
      slotOf: identity,
      colorBy: null,
      filterBys: [sparseRule(0, 40), { table: "t", column: "area", min: 10 }],
      colorValues: null,
      ruleValues: [
        new Map<number, unknown>([[1, 12]]),
        new Map<number, unknown>([
          [1, 50],
          [2, 50],
        ]),
      ],
    });
    expect(lut.view[1]).toBe(CODE_NO_VALUE); // both rules keep it
    expect(lut.view[2]).toBe(CODE_NO_VALUE); // absent from the slice = 0, inside 0…40
  });
});

describe("paintValueLut — the mentioned-id union", () => {
  const identityOf = (objectId: number) => objectId;

  it("evaluates an id only ONE rule mentions against both", () => {
    // Two rules take the union path; one takes the rule's own keys. The union
    // is load-bearing: id 3 has a row for the second rule only, and the first
    // rule's answer for an id it never saw is `ruleKeeps(rule, undefined)`.
    const lut = allocateValueLut(5);
    paintValueLut({
      lut,
      slotOf: identityOf,
      colorBy: null,
      filterBys: [
        { table: "t", column: "area", min: 10 },
        { table: "t", column: "kind", values: ["good"] },
      ],
      colorValues: null,
      ruleValues: [
        new Map<number, unknown>([[1, 50]]),
        new Map<number, unknown>([
          [1, "good"],
          [3, "good"],
        ]),
      ],
    });
    expect(lut.view[1]).toBe(CODE_NO_VALUE); // both rules pass
    // id 3 passes the `kind` rule but has no `area` row, and a bounded rule
    // does not keep an id it never measured.
    expect(lut.view[3]).toBe(CODE_HIDDEN);
  });

  it("agrees with itself whether one rule or two are active", () => {
    // The one-rule path skips the `Set`; it must land on the same bytes the
    // union path would have written for the same single rule.
    const rule = { table: "t", column: "area", min: 10 };
    const values = () =>
      new Map<number, unknown>([
        [1, 50],
        [2, 5],
      ]);

    const one = allocateValueLut(4);
    paintValueLut({
      lut: one,
      slotOf: identityOf,
      colorBy: null,
      filterBys: [rule],
      colorValues: null,
      ruleValues: [values()],
    });

    // The same rule stated twice: the union is the same key set, and AND with
    // itself is itself.
    const two = allocateValueLut(4);
    paintValueLut({
      lut: two,
      slotOf: identityOf,
      colorBy: null,
      filterBys: [rule, rule],
      colorValues: null,
      ruleValues: [values(), values()],
    });

    expect(Array.from(two.data)).toEqual(Array.from(one.data));
  });
});
