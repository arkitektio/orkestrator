import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useEnsureCallMutation } from "@/lovekit/api/graphql";
import { callLink, callTitle } from "./links";
import { toStructureInputs } from "./structureInput";

export type CallableStructure = { identifier: string; id: string | number; label?: string };

/**
 * "Call about this" from a component: finds the live call about these
 * structures or starts one, then lands on its page joining. The local
 * action does the same through the service client (`lovekit/actions.ts`).
 */
export const useStartCall = () => {
  const [ensureCall] = useEnsureCallMutation({ refetchQueries: ["ListCalls"] });
  const navigate = useNavigate();
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = useCallback(
    async (structures: readonly CallableStructure[], title?: string) => {
      const about = toStructureInputs(structures);
      if (about.length === 0) {
        setError("This cannot be called about");
        return;
      }
      setStarting(true);
      setError(null);
      try {
        const result = await ensureCall({
          variables: { input: { about, title: title ?? callTitle(structures) } },
        });
        const id = result.data?.ensureCall.id;
        if (!id) throw new Error("No call came back");
        navigate(callLink(id, { join: true }));
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : "Could not start the call");
      } finally {
        setStarting(false);
      }
    },
    [ensureCall, navigate],
  );

  return { start, starting, error };
};
