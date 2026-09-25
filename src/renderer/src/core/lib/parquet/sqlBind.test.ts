import { describe, expect, it } from "vitest";
import { bindSqlLiteral } from "./sqlBind";

describe("bindSqlLiteral", () => {
  it("substitutes positional placeholders with escaped literals", () => {
    expect(
      bindSqlLiteral('SELECT "area" FROM read_parquet(?) WHERE "t" = ? AND "i" = ?', [
        "s3://b/t.parquet",
        5,
        7,
      ]),
    ).toBe(
      "SELECT \"area\" FROM read_parquet('s3://b/t.parquet') WHERE \"t\" = 5 AND \"i\" = 7",
    );
  });

  it("escapes quotes inside string parameters", () => {
    expect(bindSqlLiteral("SELECT ?", ["it's"])).toBe("SELECT 'it''s'");
  });

  it("renders bigints without precision loss", () => {
    expect(bindSqlLiteral("WHERE i = ?", [2n ** 60n])).toBe(
      "WHERE i = 1152921504606846976",
    );
  });

  it("leaves ? inside string literals untouched", () => {
    expect(bindSqlLiteral("SELECT '?' , ?", [1])).toBe("SELECT '?' , 1");
    expect(bindSqlLiteral("SELECT 'a''?b', ?", [2])).toBe("SELECT 'a''?b', 2");
  });

  it("throws on placeholder/parameter count mismatch", () => {
    expect(() => bindSqlLiteral("SELECT ?, ?", [1])).toThrow();
    expect(() => bindSqlLiteral("SELECT ?", [1, 2])).toThrow();
  });

  it("throws on non-finite numbers", () => {
    expect(() => bindSqlLiteral("SELECT ?", [Number.NaN])).toThrow();
  });
});
