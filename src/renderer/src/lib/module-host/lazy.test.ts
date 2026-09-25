import { describe, expect, it, vi } from "vitest";

import { lazyRecord, lazyValue } from "./lazy";

describe("lazyRecord", () => {
  it("builds nothing until read, then once", () => {
    const build = vi.fn(() => ({ a: 1, b: 2 }));
    const record = lazyRecord(build);
    expect(build).not.toHaveBeenCalled();
    expect(record.a).toBe(1);
    expect("b" in record).toBe(true);
    expect(Object.keys(record)).toEqual(["a", "b"]);
    expect({ ...record }).toEqual({ a: 1, b: 2 });
    expect(build).toHaveBeenCalledTimes(1);
  });
});

describe("lazyValue", () => {
  it("memoises", () => {
    const build = vi.fn(() => [1]);
    const get = lazyValue(build);
    expect(get()).toBe(get());
    expect(build).toHaveBeenCalledTimes(1);
  });
});
