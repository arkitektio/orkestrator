/**
 * What a logo blok is drawn against: its demo (blok language v2 `demo`, which
 * mirrors the roots: `{deps, args, task, queries}`) as the data model the
 * renderer reads. A logo never shows an agent's live state, so the demo is all
 * it reads; an agent's logo reads `self`, which is `deps.self`.
 */

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const logoDataModel = (demo: unknown): Record<string, unknown> => {
  if (!isRecord(demo)) return {task: null};
  const deps = isRecord(demo.deps) ? demo.deps : {};
  return {
    deps,
    ...(deps.self !== undefined ? {self: deps.self} : {}),
    args: isRecord(demo.args) ? demo.args : {},
    queries: isRecord(demo.queries) ? demo.queries : {},
    task: demo.task ?? null,
  };
};
