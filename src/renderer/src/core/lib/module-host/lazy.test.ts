import { afterEach, describe, expect, it, vi } from "vitest";

import { defineModule } from "./define";
import { registerModule, resetModuleHost } from "./host";
import { derived, derivedRecord } from "./lazy";

const module = (namespace: string) =>
  defineModule({
    manifest: { schema: 1, namespace, service: `io.test.${namespace}`, version: "0", label: namespace },
    serviceKey: namespace,
    builtins: { page: async () => ({ default: () => null }) },
  });

afterEach(() => resetModuleHost());

describe("derived", () => {
  it("builds on first read, then only when a module comes or goes", () => {
    const build = vi.fn(() => ({ n: 1 }));
    const get = derived(build);
    expect(build).not.toHaveBeenCalled();
    get();
    get();
    expect(build).toHaveBeenCalledTimes(1);
    const { unregister } = registerModule(module("alpha")) as { unregister: () => void };
    get();
    expect(build).toHaveBeenCalledTimes(2);
    unregister();
    get();
    expect(build).toHaveBeenCalledTimes(3);
  });
});

describe("derivedRecord", () => {
  it("reads like a record and follows the host", () => {
    let entries: Record<string, number> = { a: 1 };
    const record = derivedRecord(() => ({ ...entries }));
    expect({ ...record }).toEqual({ a: 1 });
    expect("a" in record).toBe(true);
    entries = { b: 2 };
    registerModule(module("beta"));
    expect(Object.keys(record)).toEqual(["b"]);
    expect(record.b).toBe(2);
  });
});
