/**
 * Why a fixture layer's file did not load, by layer id. Written by the
 * renderer (`FixtureLayer`), read by the card, which shows it as a sentence
 * through `ErrorNote`. The two are separate components, mounted in separate
 * trees, so the reason travels through here rather than through props.
 */
const failures = new Map<string, unknown>();
const listeners = new Set<() => void>();

export const setFixtureLoadFailure = (layerId: string, error: unknown | null): void => {
  if ((failures.get(layerId) ?? null) === error) return;
  if (error === null) failures.delete(layerId);
  else failures.set(layerId, error);
  for (const listener of listeners) listener();
};

export const fixtureLoadFailure = (layerId: string): unknown | null => failures.get(layerId) ?? null;

export const subscribeFixtureLoadFailures = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
