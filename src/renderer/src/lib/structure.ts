import type { JSONObject, Structure } from "@/types";

/**
 * Structures are the only currency that crosses a module border, and they
 * are compared by VALUE: identity is `identifier` + `id`, nothing else.
 * `descriptors` (what the structure provides, for action matching) and
 * `label` (a display hint) never take part.
 */

export const sameStructure = (
  left: Pick<Structure, "identifier" | "id"> | null | undefined,
  right: Pick<Structure, "identifier" | "id"> | null | undefined,
): boolean =>
  !!left && !!right && left.identifier === right.identifier && left.id === right.id;

/** A stable string key for maps, React keys and dedupe. */
export const structureKey = ({ identifier, id }: Pick<Structure, "identifier" | "id">): string =>
  `${identifier}:${id}`;

export const structure = (
  identifier: string,
  id: string | number,
  extra?: { label?: string | null; descriptors?: JSONObject | null },
): Structure => ({
  identifier,
  id: String(id),
  ...(extra?.label ? { label: extra.label } : {}),
  ...(extra?.descriptors ? { descriptors: extra.descriptors } : {}),
});

/** The rekuest wire form a Structure port takes as an argument. */
export type WireStructure = { __identifier: string; object: string };

export const toWire = ({ identifier, id }: Pick<Structure, "identifier" | "id">): WireStructure => ({
  __identifier: identifier,
  object: id,
});

/**
 * Reads the pre-v1 shape `{ identifier, object: { id, ...rest } }` (drag
 * payloads from an older window, persisted tabs) as well as the current one.
 * `name` / `label` in the old bag become the label; the rest is dropped.
 */
export const fromLegacy = (value: unknown): Structure | null => {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const identifier = record.identifier;
  if (typeof identifier !== "string") return null;
  if (typeof record.id === "string" || typeof record.id === "number") {
    return structure(identifier, record.id, {
      label: typeof record.label === "string" ? record.label : undefined,
      descriptors:
        record.descriptors && typeof record.descriptors === "object"
          ? (record.descriptors as JSONObject)
          : undefined,
    });
  }
  const object = record.object;
  if (object && typeof object === "object") {
    const bag = object as Record<string, unknown>;
    if (typeof bag.id !== "string" && typeof bag.id !== "number") return null;
    const label = typeof bag.label === "string" ? bag.label : typeof bag.name === "string" ? bag.name : undefined;
    return structure(identifier, bag.id, { label });
  }
  if (typeof object === "string") return structure(identifier, object);
  return null;
};

/** Removes value-duplicates, keeping the first occurrence (and its label). */
export const uniqueStructures = <T extends Pick<Structure, "identifier" | "id">>(items: readonly T[]): T[] => {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = structureKey(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};
