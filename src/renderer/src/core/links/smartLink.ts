/**
 * A smartlink: one object, named the way every service names it
 * (`identifier` + `id`), inside one organization and hub. Kontrol hands it
 * over as `orkestrator://smart/<org>/<hub>/<identifier>/<id>`, which arrives
 * here as the path `/smart/…` (see `LINKS.md`).
 */
export type SmartLink = {
  /** The organization's slug. */
  org: string;
  /** lok's id of the hub. Untrusted: kontrol does not check it belongs to `org`. */
  hub: string;
  identifier: string;
  id: string;
};

export const SMART_LINK_PATH = "/smart";

const decode = (segment: string): string | null => {
  try {
    return decodeURIComponent(segment);
  } catch {
    return null;
  }
};

/**
 * Read a smartlink off a path. Split on `/` FIRST, then decode each segment:
 * `@mikro/image` travels as one segment (`%40mikro%2Fimage`), and decoding
 * before splitting would break it in two. An identifier written with literal
 * slashes is accepted too: everything between the hub and the id is it.
 */
export const parseSmartPath = (pathname: string): SmartLink | null => {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.shift() !== "smart" || segments.length < 4) return null;
  const decoded = segments.map(decode);
  if (decoded.some((segment) => !segment)) return null;
  const [org, hub, ...rest] = decoded as string[];
  const id = rest.pop()!;
  const identifier = rest.join("/");
  return identifier.startsWith("@") ? { org, hub, identifier, id } : null;
};

/** The path a smartlink arrives as; the identifier is one encoded segment. */
export const buildSmartPath = ({ org, hub, identifier, id }: SmartLink): string =>
  [SMART_LINK_PATH, ...[org, hub, identifier, id].map(encodeURIComponent)].join("/");
