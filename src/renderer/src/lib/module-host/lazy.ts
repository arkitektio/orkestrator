/**
 * Registries derived from the module list are read LAZILY.
 *
 * Almost every module component imports a host registry file for its hook
 * (`useDialog` from `@/app/dialog`, ...). If that file built its registry from
 * the module list while being evaluated, whichever component happened to be
 * imported first would re-enter the list mid-evaluation and read a binding
 * that is not initialised yet. So: a registry file may import the list, but
 * only touch it on first use. `lazyRecord` / `lazyValue` are how.
 */

export const lazyValue = <T>(build: () => T): (() => T) => {
  let built = false;
  let value: T;
  return () => {
    if (!built) {
      value = build();
      built = true;
    }
    return value;
  };
};

/**
 * A plain-looking record whose entries are built on first access (property
 * read, `in`, `Object.keys`, spread). Nothing is built by creating it.
 */
export const lazyRecord = <T extends Record<string, unknown>>(build: () => T): T => {
  const get = lazyValue(build);
  return new Proxy({} as T, {
    get: (_target, key) => (typeof key === "string" ? get()[key] : undefined),
    has: (_target, key) => typeof key === "string" && key in get(),
    ownKeys: () => Reflect.ownKeys(get()),
    getOwnPropertyDescriptor: (_target, key) => {
      const record = get();
      if (typeof key !== "string" || !(key in record)) return undefined;
      return { configurable: true, enumerable: true, writable: false, value: record[key] };
    },
  });
};
