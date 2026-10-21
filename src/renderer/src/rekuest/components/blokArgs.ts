/**
 * The items a blok is opened for (`Blok.args`), read by its tree at `@args.<key>`.
 *
 * They travel in the page's URL, `?args=<json>`, so a reload or a shared link
 * opens the blok on the same item. Values are what an action takes for the
 * same port: a structure is `{__identifier, object}`, a list a list of them.
 */

/** Where a blok reads the items it is opened for: `@args.<key>`, null until it is opened for one. */
export const BLOK_ARGS_ROOT = "args";

export const BLOK_ARGS_PARAM = "args";

export type BlokArgs = Record<string, unknown>;

/** The args in a page's search string; an unreadable value is no args, never an error. */
export const readBlokArgs = (search: URLSearchParams): BlokArgs => {
  const raw = search.get(BLOK_ARGS_PARAM);
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as BlokArgs) : {};
  } catch {
    return {};
  }
};

/** The search string that opens a blok for `args` (empty for none). */
export const blokArgsSearch = (args: BlokArgs): string => {
  // Sorted, so the same args are the same link.
  const keys = Object.keys(args).filter((key) => args[key] != null).sort();
  if (keys.length === 0) return "";
  const json = JSON.stringify(Object.fromEntries(keys.map((key) => [key, args[key]])));
  return `?${new URLSearchParams({ [BLOK_ARGS_PARAM]: json })}`;
};

/** The args a blok cannot open without that `args` does not hold. */
export const missingBlokArgs = <P extends { key: string; nullable: boolean }>(ports: readonly P[], args: BlokArgs): P[] =>
  ports.filter((port) => !port.nullable && args[port.key] == null);

/** Every declared arg, null where `args` has none: what the tree reads under `@args`. */
export const seededBlokArgs = (ports: readonly { key: string }[], args: BlokArgs): BlokArgs =>
  Object.fromEntries(ports.map((port) => [port.key, args[port.key] ?? null]));
