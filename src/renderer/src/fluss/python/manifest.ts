import {
  ActionKind,
  ArgPortInput,
  Effects,
  ManifestEntryInput,
  PortKind,
  ReturnPortInput,
} from "@/fluss/api/graphql";

/**
 * A Python flow's manifest as the editor holds it: one row per alias, with
 * the action the alias calls. The server checks the source against the ports
 * a row sends and stores only the hash, so a stored version is re-hydrated by
 * looking every hash up in rekuest again (`action: null` while that runs, or
 * when rekuest no longer knows it).
 */

/** What a manifest row needs of a port: its type, never its widgets or effects. */
export type SignaturePort = {
  key: string;
  kind: PortKind | `${PortKind}`;
  nullable?: boolean | null;
  identifier?: string | null;
  default?: unknown;
  children?: SignaturePort[] | null;
};

export type ManifestAction = {
  id: string;
  hash: string;
  name: string;
  description?: string | null;
  kind: string;
  key?: string | null;
  version?: string | null;
  app?: { identifier: string } | null;
  args: SignaturePort[];
  returns: SignaturePort[];
};

export type ManifestRow = {
  alias: string;
  actionHash: string;
  effect: Effects;
  /** null while it is looked up, or when rekuest no longer knows the hash. */
  action: ManifestAction | null;
  /** The lookup finished and found nothing. */
  missing?: boolean;
};

/**
 * One port as the server takes it, exactly as fluss's `_port`
 * (`fluss/engine/python/client.py`) builds it: key, kind, nullable,
 * identifier, a default (arg side only) and the children. Nothing else.
 */
const signaturePort = (port: SignaturePort, argSide: boolean): ArgPortInput & ReturnPortInput => {
  const out: ArgPortInput & ReturnPortInput = {
    key: port.key,
    kind: port.kind as PortKind,
    nullable: !!port.nullable,
  };
  if (port.identifier) out.identifier = port.identifier;
  if (argSide && port.default !== null && port.default !== undefined) {
    (out as ArgPortInput).default = port.default as ArgPortInput["default"];
  }
  if (port.children && port.children.length > 0) {
    out.children = port.children.map((child) => signaturePort(child, argSide));
  }
  return out;
};

export const toArgPortInput = (port: SignaturePort): ArgPortInput => signaturePort(port, true);

// The return side never carries a default (`signaturePort` leaves it out).
export const toReturnPortInput = (port: SignaturePort): ReturnPortInput => signaturePort(port, false);

/** The rows the server can check against: every row whose action is known. */
export const toManifestInput = (rows: readonly ManifestRow[]): ManifestEntryInput[] =>
  rows.flatMap((row) =>
    row.action
      ? [
          {
            alias: row.alias,
            actionHash: row.actionHash,
            kind: row.action.kind as ActionKind,
            args: row.action.args.map(toArgPortInput),
            returns: row.action.returns.map(toReturnPortInput),
            effect: row.effect,
            app: row.action.app?.identifier ?? null,
            key: row.action.key ?? null,
            version: row.action.version ?? null,
          },
        ]
      : [],
  );

const collectIdentifiers = (ports: readonly SignaturePort[] | null | undefined, into: Set<string>) => {
  for (const port of ports ?? []) {
    if (port.identifier) into.add(port.identifier);
    collectIdentifiers(port.children, into);
  }
};

/**
 * The structures a stored version's signature uses that none of its actions
 * mention. The server does not store `structures`, so a version opened again
 * would fail to re-validate without them.
 */
export const seedStructures = (
  flowPorts: readonly SignaturePort[],
  rows: readonly ManifestRow[],
): string[] => {
  const used = new Set<string>();
  collectIdentifiers(flowPorts, used);
  const mentioned = new Set<string>();
  for (const row of rows) {
    collectIdentifiers(row.action?.args, mentioned);
    collectIdentifiers(row.action?.returns, mentioned);
  }
  return [...used].filter((identifier) => !mentioned.has(identifier)).sort();
};

const PYTHON_KEYWORDS = new Set([
  "False", "None", "True", "and", "as", "assert", "async", "await", "break", "class",
  "continue", "def", "del", "elif", "else", "except", "finally", "for", "from", "global",
  "if", "import", "in", "is", "lambda", "nonlocal", "not", "or", "pass", "raise",
  "return", "try", "while", "with", "yield", "main",
]);

/** A free Python identifier for an action: its name in snake case, numbered past `taken`. */
export const aliasFor = (name: string, taken: ReadonlySet<string>): string => {
  let base = name
    .trim()
    .replace(/([a-z])([A-Z])/g, "$1_$2")
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");
  if (!base) base = "action";
  if (/^[0-9]/.test(base)) base = `a_${base}`;
  if (PYTHON_KEYWORDS.has(base)) base = `${base}_action`;
  let alias = base;
  for (let n = 2; taken.has(alias); n++) alias = `${base}_${n}`;
  return alias;
};

export const isIdentifier = (alias: string) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(alias);

/** Why a row would not be accepted, if it would not. */
export const rowProblem = (row: ManifestRow, rows: readonly ManifestRow[]): string | null => {
  if (!isIdentifier(row.alias)) return "Not a Python name";
  if (PYTHON_KEYWORDS.has(row.alias)) return "A reserved word";
  if (rows.filter((other) => other.alias === row.alias).length > 1) return "Used twice";
  if (row.missing) return "Rekuest no longer knows this action";
  if (row.action && row.action.kind !== ActionKind.Function) return "Only function actions can be called";
  return null;
};
