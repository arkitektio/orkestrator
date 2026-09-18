import { describe, expect, it, vi } from "vitest";
import { PickerValuesService, type TableMeta } from "./pickerValuesService";

const units: TableMeta = {
  id: "units",
  name: "units",
  store: { id: "su" },
  columns: [
    { name: "unit", role: "COORDINATE", axisType: "INDEX" },
    { name: "region_id", role: "ATTRIBUTE", references: { id: "regions", name: "regions" } },
  ],
};
const regions: TableMeta = {
  id: "regions",
  name: "regions",
  store: { id: "sr" },
  columns: [{ name: "region", role: "COORDINATE", axisType: "INDEX" }, { name: "name", role: "LABEL" }],
};

const setup = () => {
  const readAcross = vi.fn(async () => [
    { __key: 1n, __v: "CA1" },
    { __key: "2", __v: "CA3" },
  ]);
  const fetchTable = vi.fn(async (id: string) => (id === "regions" ? regions : null));
  const service = new PickerValuesService({ engine: () => ({ readAcross }) as never, fetchTable });
  return { service, readAcross, fetchTable };
};

describe("PickerValuesService", () => {
  it("walks a join once and shares the map between askers, keys normalized", async () => {
    const { service, readAcross, fetchTable } = setup();
    const entry = { table: "regions", column: "name", joinPath: [{ table: "units", column: "region_id" }] };
    const [a, b] = await Promise.all([
      service.values(units, [{ key: "c0", entry }], 0),
      service.values(units, [{ key: "c0", entry }], 0),
    ]);
    expect(readAcross).toHaveBeenCalledTimes(1);
    expect(fetchTable).toHaveBeenCalledTimes(1);
    expect(a.maps.c0.get(1)).toBe("CA1");
    expect(b.maps.c0.get(2)).toBe("CA3");
  });

  it("reports why an entry cannot be drawn instead of dropping it silently", async () => {
    const { service } = setup();
    const out = await service.values(units, [{ key: "c0", entry: { table: "elsewhere", column: "x" } }], 0);
    expect(out.problems.c0).toMatch(/do not key/);
  });

  it("skips direct entries at from=1: their column rides on the events read", async () => {
    const { service, readAcross } = setup();
    const out = await service.values(units, [{ key: "f0", entry: { table: "units", column: "region_id" } }], 1);
    expect(out.maps.f0).toBeUndefined();
    expect(readAcross).not.toHaveBeenCalled();
  });

  it("does not keep a failed read", async () => {
    const { service, readAcross } = setup();
    readAcross.mockRejectedValueOnce(new Error("403"));
    const entry = { table: "units", column: "region_id" };
    expect((await service.values(units, [{ key: "c", entry }], 0)).problems.c).toBe("403");
    expect((await service.values(units, [{ key: "c", entry }], 0)).maps.c).toBeDefined();
  });
});
