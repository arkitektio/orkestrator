/**
 * What the blok editor edits beside the BSX (blok language v2): the demo
 * (what the preview shows, mirroring the roots), as JSON text. Everything
 * else a blok declares (its `<local>`s, `<query>`s and `<subscription>`s) is
 * in its source.
 */

export type DeclarationsDraft = {
  /** The demo as JSON text: `{deps, args, task, queries, subscriptions}`. */
  demo: string;
};

export const emptyDeclarationsDraft = (): DeclarationsDraft => ({ demo: "{}" });

/** The demo as the editor shows it: the roots it mirrors that hold something, no `__typename`. */
const demoOf = (demo: unknown): Record<string, unknown> =>
  demo && typeof demo === "object" && !Array.isArray(demo)
    ? Object.fromEntries(Object.entries(demo).filter(([key, value]) => key !== "__typename" && value != null))
    : {};

export const declarationsDraft = (blok: { demo?: unknown }): DeclarationsDraft => ({
  demo: JSON.stringify(demoOf(blok.demo), null, 2),
});

/**
 * The locals of the draft as its tree resolves them: the server's dry run
 * (`BlokEdit.resolvedLocals`) when it answered exactly this draft, else the
 * local validator's (null while the source does not parse). Each says its
 * `node`, the `<local>` that declares it.
 */
export const draftResolvedLocals = <Local extends { node: string; key: string; kind: string }>(
  local: ReadonlyArray<Local> | null,
  server: { checked: string; resolvedLocals: ReadonlyArray<Local> } | null,
  draft: string | null,
): ReadonlyArray<Local> | null => (server !== null && draft !== null && server.checked === draft ? server.resolvedLocals : local);

export type DeclarationsBuilt = {
  demo: Record<string, unknown>;
  /** Problems by where they are (`demo`). */
  problems: Map<string, string>;
};

const DEMO_ROOTS = new Set(["deps", "args", "task", "queries", "subscriptions"]);

/** The draft as the wire input a save sends, and what is wrong with it. */
export const buildDeclarations = (draft: DeclarationsDraft): DeclarationsBuilt => {
  const problems = new Map<string, string>();
  let demo: Record<string, unknown> = {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(draft.demo.trim() || "{}") as unknown;
  } catch (error) {
    problems.set("demo", error instanceof Error ? error.message : "Not JSON.");
    return { demo, problems };
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    problems.set("demo", "The demo is a JSON object: {deps, args, task, queries, subscriptions}.");
  } else {
    demo = parsed as Record<string, unknown>;
    const unknown = Object.keys(demo).filter((key) => !DEMO_ROOTS.has(key));
    if (unknown.length) problems.set("demo", `The demo mirrors the roots (deps, args, task, queries, subscriptions), not ${unknown.join(", ")}.`);
  }
  return { demo, problems };
};
