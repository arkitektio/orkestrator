import { PortKind } from "@/rekuest/api/graphql";

/**
 * Structural port shape shared by `ArgPortInput` and `ReturnPortInput` — all we
 * need to (de)serialize a value against its definition.
 */
export type SerPort = {
  key: string;
  kind: PortKind;
  identifier?: string | null;
  children?: SerPort[] | null;
};

const isStructureLike = (kind: PortKind) =>
  kind === PortKind.Structure || kind === PortKind.MemoryStructure;

const isWireStructure = (value: unknown): value is { __identifier: string; object: unknown } =>
  !!value &&
  typeof value === "object" &&
  "__identifier" in (value as Record<string, unknown>) &&
  "object" in (value as Record<string, unknown>);

/**
 * Expand a single wire value into the shape a handler works with. Structures
 * arrive shrunk as `{ __identifier, object }`; the client has no structure
 * registry, so expansion just unwraps to the bare `object` id. Lists/dicts/
 * models recurse; scalars pass through.
 */
export const expandValue = (value: unknown, port: SerPort): unknown => {
  if (value === null || value === undefined) return value;

  if (isStructureLike(port.kind)) {
    return isWireStructure(value) ? value.object : value;
  }

  if (port.kind === PortKind.List) {
    const child = port.children?.[0];
    if (!child || !Array.isArray(value)) return value;
    return value.map((item) => expandValue(item, child));
  }

  if (port.kind === PortKind.Dict) {
    const child = port.children?.[0];
    if (!child || typeof value !== "object") return value;
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [
        k,
        expandValue(v, child),
      ]),
    );
  }

  if (port.kind === PortKind.Model) {
    if (typeof value !== "object" || !port.children) return value;
    const source = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const child of port.children) {
      out[child.key] = expandValue(source[child.key], child);
    }
    return out;
  }

  return value;
};

/**
 * Shrink a handler's return value back into wire form. Structures become
 * `{ __identifier, object }` (accepting either a bare id or an object with an
 * `id`); already-shrunk values pass through untouched.
 */
export const shrinkValue = (value: unknown, port: SerPort): unknown => {
  if (value === null || value === undefined) return value;

  if (isStructureLike(port.kind)) {
    if (isWireStructure(value)) return value;
    const id =
      typeof value === "object" && value !== null && "id" in value
        ? (value as { id: unknown }).id
        : value;
    return { __identifier: port.identifier, object: String(id) };
  }

  if (port.kind === PortKind.List) {
    const child = port.children?.[0];
    if (!child || !Array.isArray(value)) return value;
    return value.map((item) => shrinkValue(item, child));
  }

  if (port.kind === PortKind.Dict) {
    const child = port.children?.[0];
    if (!child || typeof value !== "object") return value;
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [
        k,
        shrinkValue(v, child),
      ]),
    );
  }

  if (port.kind === PortKind.Model) {
    if (typeof value !== "object" || !port.children) return value;
    const source = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const child of port.children) {
      out[child.key] = shrinkValue(source[child.key], child);
    }
    return out;
  }

  return value;
};

/** Expand the incoming `ASSIGN.args` dict against the definition's arg ports. */
export const expandArgs = (
  args: Record<string, unknown>,
  ports: readonly SerPort[],
): Record<string, unknown> => {
  const out: Record<string, unknown> = { ...args };
  for (const port of ports) {
    if (port.key in args) {
      out[port.key] = expandValue(args[port.key], port);
    }
  }
  return out;
};

/** Shrink a handler's returns dict against the definition's return ports. */
export const shrinkReturns = (
  returns: Record<string, unknown> | null | undefined,
  ports: readonly SerPort[],
): Record<string, unknown> | null | undefined => {
  if (!returns) return returns;
  const out: Record<string, unknown> = { ...returns };
  for (const port of ports) {
    if (port.key in returns) {
      out[port.key] = shrinkValue(returns[port.key], port);
    }
  }
  return out;
};
