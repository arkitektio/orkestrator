/**
 * The bloks that decorate models, asked for in batches: every model a scene
 * shows asks in the same moment, and one request answers them all
 * (`bloksForModels(refs)`), instead of one request per model.
 */

type Waiting<T> = { resolve: (bloks: T[]) => void; reject: (error: unknown) => void };

export type ModelBlokBatcher<T> = (ref: string) => Promise<T[]>;

/**
 * `load` is called once per batch with every ref asked for since the last
 * one; each ref gets the bloks whose `forModel` is it (none when there are none).
 */
export const createModelBlokBatcher = <T extends { forModel?: string | null }>(
  load: (refs: string[]) => Promise<readonly T[]>,
  schedule: (flush: () => void) => void = (flush) => setTimeout(flush, 0),
): ModelBlokBatcher<T> => {
  let pending = new Map<string, Waiting<T>[]>();
  let scheduled = false;

  const flush = () => {
    scheduled = false;
    const batch = pending;
    pending = new Map();
    load([...batch.keys()]).then(
      (bloks) => {
        for (const [ref, waiting] of batch) {
          const own = bloks.filter((blok) => blok.forModel === ref);
          waiting.forEach((each) => each.resolve(own));
        }
      },
      (error: unknown) => {
        for (const waiting of batch.values()) waiting.forEach((each) => each.reject(error));
      },
    );
  };

  return (ref) =>
    new Promise<T[]>((resolve, reject) => {
      const waiting = pending.get(ref) ?? [];
      waiting.push({ resolve, reject });
      pending.set(ref, waiting);
      if (!scheduled) {
        scheduled = true;
        schedule(flush);
      }
    });
};
