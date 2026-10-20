import { useCallback, useState } from "react";

import { describeError } from "@/core/notify";
import { useJoinCallMutation } from "@/lovekit/api/graphql";
import { callStore, useCallState, type ActiveCall } from "./store";

/**
 * Join a call from any lovekit surface: mints the token and hands it to the
 * store, where `CallConnection` picks it up. Joining another call first
 * leaves the one this window is in.
 */
export const useJoinCall = () => {
  const [joinCall] = useJoinCallMutation();
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const active = useCallState((state) => state.call);

  const join = useCallback(
    async (call: ActiveCall) => {
      setJoining(true);
      setError(null);
      try {
        const result = await joinCall({ variables: { input: { call: call.id } } });
        const token = result.data?.joinCall;
        if (!token) throw new Error("The call handed out no token");
        callStore.getState().start(call, token);
      } catch (nextError) {
        setError(`Couldn't join the call: ${describeError(nextError).message}`);
      } finally {
        setJoining(false);
      }
    },
    [joinCall],
  );

  return { join, joining, error, active };
};
