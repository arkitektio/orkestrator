// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";

import { ColumnRole } from "@/mikro/api/graphql";
import { matchPositions, positionColumnsOf, readAxisPositions } from "./axisPositions";

const table = (columns: { name: string; role: ColumnRole }[], id = "t1") =>
  ({
    id,
    name: "genes",
    axisNames: ["gene_index"],
    store: { id: "parquet-genes", bucket: "b", key: "k" },
    columns,
  }) as never;

describe("positionColumnsOf", () => {
  it("takes the INDEX coordinate as the position and a LABEL as the name", () => {
    // A position IS a row of this table, keyed by its single INDEX coordinate —
    // the column `createTableDataset` requires of any reference target.
    expect(
      positionColumnsOf(
        table([
          { name: "gene_index", role: ColumnRole.Coordinate },
          { name: "symbol", role: ColumnRole.Label },
        ]),
      ),
    ).toEqual({ index: "gene_index", label: "symbol" });
  });

  it("lists positions even when the axis has no names", () => {
    // Falling back to the index rather than refusing: an unnamed axis is still
    // selectable, it just reads as numbers.
    expect(positionColumnsOf(table([{ name: "gene_index", role: ColumnRole.Coordinate }]))).toEqual({
      index: "gene_index",
      label: null,
    });
  });

  it("returns null when nothing identifies a row", () => {
    expect(positionColumnsOf(table([{ name: "counts", role: ColumnRole.Attribute }]))).toBeNull();
  });
});

describe("readAxisPositions", () => {
  it("reads once per table and caches — a gene switch never re-reads the list", async () => {
    const readAcross = vi.fn().mockResolvedValue([
      { position: 0, label: "CD3E" },
      { position: 1, label: "IL7R" },
    ]);
    const engine = { readAcross } as never;
    const genes = table(
      [
        { name: "gene_index", role: ColumnRole.Coordinate },
        { name: "symbol", role: ColumnRole.Label },
      ],
      "cache-once",
    );

    const first = await readAxisPositions(engine, genes);
    const second = await readAxisPositions(engine, genes);
    expect(first).toEqual([
      { value: 0, label: "CD3E" },
      { value: 1, label: "IL7R" },
    ]);
    expect(second).toBe(first);
    expect(readAcross).toHaveBeenCalledTimes(1);
  });

  it("orders by position, so a row index means the same thing every time", async () => {
    const readAcross = vi.fn().mockResolvedValue([]);
    await readAxisPositions({ readAcross } as never, table([{ name: "i", role: ColumnRole.Coordinate }], "ordered"));
    const sql = readAcross.mock.calls[0][1](() => "s3://b/k");
    expect(sql).toContain("ORDER BY position");
  });
});

describe("matchPositions", () => {
  const positions = [
    { value: 0, label: "MIL7A" },
    { value: 1, label: "IL7R" },
    { value: 2, label: "IL7" },
    { value: 3, label: "CD3E" },
  ];

  it("puts prefix matches before substring ones", () => {
    // A gene list is full of names containing each other; typing "IL7" should
    // reach IL7R and IL7 before MIL7A, which merely contains it.
    expect(matchPositions(positions, "IL7").map((entry) => entry.label)).toEqual([
      "IL7R",
      "IL7",
      "MIL7A",
    ]);
  });

  it("is case-insensitive and caps the list", () => {
    expect(matchPositions(positions, "il7r")[0].label).toBe("IL7R");
    expect(matchPositions(positions, "", 2)).toHaveLength(2);
  });
});
