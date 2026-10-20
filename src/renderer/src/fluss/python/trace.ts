import type { LineMark } from "./PythonSourceEditor";

/** What a run's child task says of one call. */
export type CallTask = {
  callKey?: string | null;
  latestEventKind?: string | null;
  action?: { hash: string } | null;
};

const DONE = new Set(["YIELD", "COMPLETED"]);
const FAILED = new Set(["FAILED", "CRITICAL", "CANCELLED", "LOST", "DENIED", "INTERRUPTED"]);

const toneOf = (kind: string | null | undefined): LineMark["tone"] =>
  !kind ? "idle" : DONE.has(kind) ? "done" : FAILED.has(kind) ? "failed" : "running";

/**
 * The alias a call went out under. Its key is `alias:digest:n`; a task
 * without one is matched by its action's hash.
 */
export const aliasOfCall = (task: CallTask, aliasByHash: ReadonlyMap<string, string>): string | null => {
  const fromKey = task.callKey?.split(":")[0];
  if (fromKey) return fromKey;
  return task.action ? (aliasByHash.get(task.action.hash) ?? null) : null;
};

/**
 * The run's calls drawn on its source: every line that calls an alias, in
 * the state of that alias's calls. A call key names the alias, not the line,
 * so every line calling one alias shares its state.
 */
export const callMarks = (
  source: string,
  manifest: readonly { alias: string; actionHash: string }[],
  calls: readonly CallTask[],
): LineMark[] => {
  const aliasByHash = new Map(manifest.map((entry) => [entry.actionHash, entry.alias]));
  const byAlias = new Map<string, LineMark["tone"][]>();
  for (const call of calls) {
    const alias = aliasOfCall(call, aliasByHash);
    if (!alias) continue;
    byAlias.set(alias, [...(byAlias.get(alias) ?? []), toneOf(call.latestEventKind)]);
  }

  const lines = source.split("\n");
  const marks: LineMark[] = [];
  for (const { alias } of manifest) {
    const tones = byAlias.get(alias) ?? [];
    const tone: LineMark["tone"] = tones.includes("running")
      ? "running"
      : tones.includes("failed")
        ? "failed"
        : tones.length > 0
          ? "done"
          : "idle";
    const count = (t: LineMark["tone"]) => tones.filter((x) => x === t).length;
    const hover =
      tones.length === 0
        ? `**${alias}**: not called yet`
        : `**${alias}**: ${tones.length} ${tones.length === 1 ? "call" : "calls"}` +
          [
            count("done") && `${count("done")} done`,
            count("running") && `${count("running")} running`,
            count("failed") && `${count("failed")} failed`,
          ]
            .filter(Boolean)
            .map((part) => ` · ${part}`)
            .join("");
    const pattern = new RegExp(`\\b${alias}\\s*\\(`);
    lines.forEach((text, index) => {
      if (pattern.test(text.replace(/#.*$/, ""))) marks.push({ line: index + 1, tone, hover });
    });
  }
  return marks;
};
