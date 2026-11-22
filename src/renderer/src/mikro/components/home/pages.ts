/**
 * Pages of a list asked for one request each ("Show more" adds a page), put
 * back together in order.
 */

/** The answers of the pages shown, in order, up to the first that has not come yet. */
export const loadedPages = <T>(answers: readonly (T | undefined)[], pages: number): T[] => {
  const loaded: T[] = [];
  for (let index = 0; index < pages; index++) {
    const answer = answers[index];
    if (answer === undefined) break;
    loaded.push(answer);
  }
  return loaded;
};

/**
 * Whether another page may follow: every page shown has answered and the last
 * one came back full. A short last page is the end of the list.
 */
export const hasMorePages = (
  loaded: readonly { answered: boolean; roots: readonly unknown[] }[],
  pages: number,
  pageSize: number,
): boolean => {
  const last = loaded.at(-1);
  return loaded.length === pages && last !== undefined && last.answered && last.roots.length >= pageSize;
};
