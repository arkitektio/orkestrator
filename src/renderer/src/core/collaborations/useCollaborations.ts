import { useCallback, useEffect, useState } from "react";

import { useOperation } from "@/core/modules/hooks/useOperation";

/** A collaboration as lok keeps it (`lok.collaborations`): its key names it on every service. */
export type LokCollaboration = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  createdAt: string;
};

/**
 * The active organization's collaborations, from lok (`lok.collaborations`), narrowed by
 * `search` on the server. `refresh` asks again (after one was made elsewhere).
 */
export const useLokCollaborations = (search?: string) => {
  const list = useOperation<LokCollaboration[]>("lok.collaborations");
  const [collaborations, setCollaborations] = useState<LokCollaboration[]>();
  const [error, setError] = useState<unknown>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const term = search?.trim();
    list(term ? { search: term } : {})
      .then((found) => {
        if (cancelled) return;
        setCollaborations(found);
        setError(null);
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(reason);
      });
    return () => {
      cancelled = true;
    };
  }, [list, search, tick]);

  const refresh = useCallback(() => setTick((current) => current + 1), []);
  return { collaborations, loading: collaborations === undefined && !error, error, refresh };
};

/** Make a collaboration in lok (`lok.createCollaboration`): empty until something is put in it. */
export const useCreateLokCollaboration = () => {
  const create = useOperation<LokCollaboration>("lok.createCollaboration");
  return useCallback(
    (name: string, description?: string | null) => create({ name: name.trim(), description: description ?? null }),
    [create],
  );
};
