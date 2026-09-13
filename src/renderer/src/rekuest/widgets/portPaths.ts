/**
 * Dependency paths used by validators and effects.
 *
 * A validator's or effect's `dependencies` name other ports. Three spellings:
 *
 * - `name`      a sibling of the port (the common case);
 * - `a..b`      walk into a sibling's value (`..` is the documented nested
 *               syntax; `/` is accepted as well for symmetry with widget
 *               dependencies, see `useWidgetDependencies`);
 * - `/a..b`     absolute from the root of the ports' values (the args object),
 *               for a port nested in a model that needs a top-level value.
 */

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export const splitDependencyPath = (
  name: string,
): { absolute: boolean; segments: string[] } => {
  const absolute = name.startsWith("/");
  const body = absolute ? name.slice(1) : name;
  return {
    absolute,
    segments: body.split(/\.\.|\//).filter((segment) => segment.length > 0),
  };
};

export const readValuePath = (
  root: unknown,
  segments: readonly string[],
): { found: boolean; value: unknown } => {
  let current: unknown = root;
  for (const segment of segments) {
    if (Array.isArray(current)) {
      const index = Number(segment);
      if (!Number.isInteger(index) || index < 0 || index >= current.length) {
        return { found: false, value: undefined };
      }
      current = current[index];
      continue;
    }
    if (!isRecord(current) || !(segment in current)) {
      return { found: false, value: undefined };
    }
    current = current[segment];
  }
  return { found: true, value: current };
};

/**
 * Resolve a dependency name against the port's local scope (its siblings'
 * values) and the root values object. `found` is false when the path does not
 * exist at all; a present-but-undefined value also reports `undefined`, which
 * callers treat as "not set yet".
 */
export const resolveDependencyValue = (
  name: string,
  local: unknown,
  root: unknown = local,
): { found: boolean; value: unknown } => {
  const { absolute, segments } = splitDependencyPath(name);
  if (segments.length === 0) return { found: false, value: undefined };
  return readValuePath(absolute ? root : local, segments);
};

/**
 * Translate a dependency name into the react-hook-form field name it refers
 * to, given the RHF path of the port that declares it (e.g. `["args", "min"]`).
 * Relative names resolve against the port's parent; absolute names against the
 * ports root, which is the declaring port's path minus everything below the
 * ports root (`portsPath`).
 */
export const dependencyFieldName = (
  name: string,
  portPath: readonly string[],
  portsPath: readonly string[] = [],
): string => {
  const { absolute, segments } = splitDependencyPath(name);
  const base = absolute ? [...portsPath] : portPath.slice(0, -1);
  return [...base, ...segments].join(".");
};
