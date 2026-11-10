import type { RoleRequirement } from "@/core/connection/roles";

/**
 * Intents: links that must keep working for years.
 *
 * A README badge, a paper or a docs page cannot be edited once published, so
 * what it holds must not be a route of this app: routes move with every
 * refactor, and a module may be missing from the deployment that opens the
 * link. An intent link names WHAT the person wants done, in a versioned
 * vocabulary the app promises to keep reading:
 *
 *   /do/v1/repo.install?source=github:user/repo&ref=main
 *
 * A module declares which intents it handles (`intents` builtin) and maps the
 * parsed parameters onto its current route; `IntentPage` walks the host's
 * ladder in between (readable, known, valid, permitted, which organization,
 * service ready). See `core/links/LINKS.md` §"Intents".
 */

/** The first path segment of every intent link (reserved for the host). */
export const INTENT_SEGMENT = "do";

/**
 * Internal: the login a person already picked on the intent page. It rides
 * the remembered path through a profile switch so the page does not ask again
 * on the other side; never part of a published link.
 */
export const PICKED_PROFILE_PARAM = "in";

/** `repo.install`: lowercase words joined by dots. */
const NAME = /^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*)+$/;

export type IntentLink = {
  name: string;
  version: number;
  params: URLSearchParams;
};

/**
 * Read `/do/v<version>/<name>` (+ query). `null` when it is not an intent link
 * at all; a link with a well-formed shape but an unknown name or version still
 * parses (the page says it needs a newer app).
 */
export const parseIntentPath = (pathname: string, search = ""): IntentLink | null => {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length !== 3 || segments[0] !== INTENT_SEGMENT) return null;
  const versionMatch = /^v([1-9][0-9]{0,3})$/.exec(segments[1]);
  if (!versionMatch) return null;
  let name: string;
  try {
    name = decodeURIComponent(segments[2]);
  } catch {
    return null;
  }
  if (!NAME.test(name)) return null;
  return { name, version: Number(versionMatch[1]), params: new URLSearchParams(search) };
};

/**
 * The app path of an intent link. Parameters keep the order given, so a badge
 * built twice is byte-for-byte the same link.
 */
export const intentPath = (
  name: string,
  params: Record<string, string | undefined> | [string, string][] = {},
  version = 1,
): string => {
  if (!NAME.test(name)) throw new Error(`"${name}" is not an intent name`);
  const entries = Array.isArray(params)
    ? params
    : Object.entries(params).filter((entry): entry is [string, string] => entry[1] !== undefined);
  const query = new URLSearchParams(entries).toString();
  return `/${INTENT_SEGMENT}/v${version}/${name}${query ? `?${query}` : ""}`;
};

export type IntentParse<T> = { ok: true; value: T } | { ok: false; problem: string };

/**
 * One intent a module answers.
 *
 * The name and every parameter it reads are a public promise: once a link
 * with them is out, a later app must still read it. Add parameters freely
 * (old links simply lack them); change the meaning of one only with a new
 * `version`, and keep parsing the old ones.
 */
export type IntentDecl<T = any> = {
  /** `"repo.install"`. Not namespaced: the verb outlives whichever module answers it. */
  name: string;
  /** The highest version this app reads. A link with a higher one asks for an update. */
  version: number;
  /** What the person is asked to do, as a heading: "Install a repository". */
  title: string;
  /** The service the target needs; defaults to the module's own. */
  serviceKey?: string;
  /** Who may follow it; defaults to the module's own `roles`. */
  roles?: RoleRequirement;
  /**
   * Whether the organization matters (it acts IN one: installs, creates).
   * With more than one login on this device the page then asks which, instead
   * of silently using whichever is active.
   */
  picksOrganization?: boolean;
  /**
   * The link's parameters, read defensively: they are untrusted text from
   * anywhere. `version` is the link's own, for reading older shapes.
   */
  parse: (params: URLSearchParams, version: number) => IntentParse<T>;
  /** One line naming the thing: "user/repo". */
  describe?: (value: T) => string;
  /** Where the module handles it now: an app path. Free to change. */
  target: (value: T) => string;
};
