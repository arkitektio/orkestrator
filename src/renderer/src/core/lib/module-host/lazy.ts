import { moduleHostVersion } from "./host";

/**
 * Registries derived from the module host are read on use, never while
 * files are being evaluated, and rebuilt when a module comes or goes.
 *
 * `derived(build)` memoises `build` on the host's version; `liveRecord(get)`
 * is a plain-looking record (property read, `in`, `Object.keys`, spread)
 * that always answers from `get()`. Creating either builds nothing.
 */

export const derived = <T>(build: () => T): (() => T) => {
  let builtAt = -1;
  let value: T;
  return () => {
    const version = moduleHostVersion();
    if (version !== builtAt) {
      value = build();
      builtAt = version;
    }
    return value;
  };
};

export const liveRecord = <T extends Record<string, unknown>>(get: () => T): T =>
  new Proxy({} as T, {
    get: (_target, key) => (typeof key === "string" ? get()[key] : undefined),
    has: (_target, key) => typeof key === "string" && key in get(),
    ownKeys: () => Reflect.ownKeys(get()),
    getOwnPropertyDescriptor: (_target, key) => {
      const record = get();
      if (typeof key !== "string" || !(key in record)) return undefined;
      return { configurable: true, enumerable: true, writable: false, value: record[key] };
    },
  });

/** A record derived from the installed modules, rebuilt when they change. */
export const derivedRecord = <T extends Record<string, unknown>>(build: () => T): T =>
  liveRecord(derived(build));
