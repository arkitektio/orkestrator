// @vitest-environment jsdom
import { describe, expect, it } from "vitest";

import {
  mergeRowSelection,
  resolveRowKey,
  type Item,
} from "./TableDatasetTable";
import { rowsToCsv } from "./useDuckDbTable";

const COLUMNS = ["t", "value"];

describe("resolveRowKey", () => {
  it("keys a row by its values, so paging and sorting keep pointing at the same row", () => {
    const row: Item = { t: 1, value: 4.5 };

    expect(resolveRowKey(row, COLUMNS)).toBe(
      resolveRowKey({ value: 4.5, t: 1 }, COLUMNS),
    );
    expect(resolveRowKey(row, COLUMNS)).not.toBe(
      resolveRowKey({ t: 1, value: 4.6 }, COLUMNS),
    );
  });

  it("prefers a string id when the parquet carries one", () => {
    expect(resolveRowKey({ id: "abc", t: 1 }, ["id", "t"])).toBe("abc");
  });
});

describe("mergeRowSelection", () => {
  const pageOneRow: Item = { t: 1, value: 4.5 };
  const pageTwoRow: Item = { t: 42, value: 9.5 };
  const pageOneKey = resolveRowKey(pageOneRow, COLUMNS);
  const pageTwoKey = resolveRowKey(pageTwoRow, COLUMNS);

  it("captures the record of a row selected on the current page", () => {
    expect(
      mergeRowSelection(
        {},
        { [pageOneKey]: true },
        { [pageOneKey]: pageOneRow },
      ),
    ).toEqual({ [pageOneKey]: pageOneRow });
  });

  it("keeps rows selected on an earlier page once that page is gone", () => {
    const merged = mergeRowSelection(
      { [pageOneKey]: pageOneRow },
      { [pageOneKey]: true, [pageTwoKey]: true },
      // Page two is what is loaded now — page one's row is nowhere in `rows`.
      { [pageTwoKey]: pageTwoRow },
    );

    expect(merged).toEqual({
      [pageOneKey]: pageOneRow,
      [pageTwoKey]: pageTwoRow,
    });
  });

  it("drops deselected rows and their records", () => {
    expect(
      mergeRowSelection(
        { [pageOneKey]: pageOneRow, [pageTwoKey]: pageTwoRow },
        { [pageOneKey]: false, [pageTwoKey]: true },
        {},
      ),
    ).toEqual({ [pageTwoKey]: pageTwoRow });
  });

  it("ignores a key it has no record for rather than exporting a blank row", () => {
    expect(mergeRowSelection({}, { unknown: true }, {})).toEqual({});
  });
});

describe("rowsToCsv", () => {
  it("writes the given columns in order and quotes separators", () => {
    expect(
      rowsToCsv(
        [
          { t: 1, value: 4.5, note: "a,b" },
          { t: 2, value: null, note: 'say "hi"' },
        ],
        ["t", "note"],
      ),
    ).toBe(["t,note", '1,"a,b"', '2,"say ""hi"""'].join("\n"));
  });
});
