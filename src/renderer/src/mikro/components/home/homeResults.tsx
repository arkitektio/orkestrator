import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { LineageNodeKind, useHomeResultsQuery } from "../../api/graphql";
import { resultsByRoot, rootKey, SeriesResults } from "./fileResults";

type Root = { kind: LineageNodeKind; id: string };

type HomeResultsValue = {
  register: (root: Root) => () => void;
  results: Map<string, SeriesResults> | undefined;
};

const HomeResultsContext = createContext<HomeResultsValue | null>(null);

/**
 * What was made from every tile on the home page, asked in ONE query.
 *
 * Tiles say what they show by calling `useHomeResult`; the provider collects
 * them and asks `descendants` for all at once, so a page of tiles costs one
 * walk on the server rather than one lineage per tile. A tile that mounts or
 * unmounts (paging, "Show more files") changes the set, and the query is asked
 * again with the new one; the previous answer stays on screen meanwhile.
 */
export const HomeResultsProvider = ({ children }: { children: React.ReactNode }) => {
  // How many tiles show each root: the same image can be on two cards.
  const counts = useRef(new Map<string, { root: Root; count: number }>());
  const [roots, setRoots] = useState<Root[]>([]);

  const publish = useCallback(() => {
    const next = [...counts.current.values()]
      .map((entry) => entry.root)
      .sort((a, b) => rootKey(a.kind, a.id).localeCompare(rootKey(b.kind, b.id)));
    setRoots((previous) =>
      previous.length === next.length &&
      previous.every((root, index) => rootKey(root.kind, root.id) === rootKey(next[index].kind, next[index].id))
        ? previous
        : next,
    );
  }, []);

  const register = useCallback(
    (root: Root) => {
      const key = rootKey(root.kind, root.id);
      const entry = counts.current.get(key);
      if (entry) entry.count += 1;
      else counts.current.set(key, { root, count: 1 });
      publish();
      return () => {
        const current = counts.current.get(key);
        if (!current) return;
        current.count -= 1;
        if (current.count <= 0) counts.current.delete(key);
        publish();
      };
    },
    [publish],
  );

  const starts = useMemo(() => roots.map(({ kind, id }) => ({ kind, id })), [roots]);
  const { data, previousData, error } = useHomeResultsQuery({
    variables: { starts },
    skip: starts.length === 0,
    fetchPolicy: "cache-and-network",
  });
  useEffect(() => {
    // The tiles still show their pictures without it: a console line, not a message.
    if (error) console.warn("Couldn't load what was made from the home page's data", error);
  }, [error]);

  const answer = data ?? previousData;
  const results = useMemo(() => (answer ? resultsByRoot(answer.descendants) : undefined), [answer]);
  const value = useMemo(() => ({ register, results }), [register, results]);

  return <HomeResultsContext.Provider value={value}>{children}</HomeResultsContext.Provider>;
};

/**
 * What was made from one tile's object, for a tile on the home page. Outside
 * a `HomeResultsProvider` (a list page) it asks nothing and answers nothing.
 */
export const useHomeResult = (kind: LineageNodeKind, id: string): SeriesResults | undefined => {
  const context = useContext(HomeResultsContext);
  const register = context?.register;
  useEffect(() => register?.({ kind, id }), [register, kind, id]);
  return context?.results?.get(rootKey(kind, id));
};

/** Every answer so far, by root key: for a card that sums its tiles' results. */
export const useHomeResultMap = () => useContext(HomeResultsContext)?.results;
