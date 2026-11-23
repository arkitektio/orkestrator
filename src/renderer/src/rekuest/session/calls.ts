import { useCallback, useMemo, useState } from "react";
import type { DecideInput } from "../api/graphql";
import type { RekuestSession } from "./client";
import { useRekuestSession } from "./hooks";

/**
 * What a person asks of a task, over the window's caller session (takt
 * `/session`): the answer comes back on the same socket, and a call re-sent
 * after a drop is applied once. A refusal rejects with the server's sentence;
 * the caller reports it (CLAUDE.md §8). A call made while the socket is down
 * goes out once it is back.
 */

export type TaskControlKind = "CANCEL" | "INTERRUPT" | "PAUSE" | "RESUME";

/** The caller session beside a rekuest service (a local action's `services.rekuest`). */
export const sessionOf = (service: unknown): RekuestSession => {
  const session = (service as { session?: RekuestSession } | undefined)?.session;
  if (!session) throw new Error("Rekuest is not connected.");
  return session;
};

/** How long a window may be gone before a run tied to it is cancelled, unless chosen. */
export const DEFAULT_DEADMAN_SECONDS = 60;

/** Cancel, interrupt, pause or resume (`step`: to the next pausepoint) a task. */
export const controlTask = async (
  session: RekuestSession,
  kind: TaskControlKind,
  task: string,
  step = false,
): Promise<void> => {
  await session.call(kind === "RESUME" ? { type: kind, task, step } : { type: kind, task });
};

/** Answer a held task. */
export const decideTask = async (session: RekuestSession, input: DecideInput): Promise<void> => {
  await session.call({
    type: "DECIDE",
    task: input.task,
    approved: input.approved,
    answer: input.answer ?? null,
    values: (input.values as Record<string, unknown> | null | undefined) ?? null,
    remember: input.remember ?? null,
  });
};

/**
 * Tie a task to this window (the dead man switch: cancelled once the window has been gone
 * `seconds`), or untie it (`null`).
 */
export const setDeadman = async (
  session: RekuestSession,
  task: string,
  seconds: number | null,
): Promise<void> => {
  await session.call({ type: "DEADMAN", task, seconds });
};

/** The calls above, bound to this window's session. */
export const useTaskCalls = () => {
  const session = useRekuestSession();
  return useMemo(
    () => ({
      control: (kind: TaskControlKind, task: string, step = false) =>
        controlTask(session, kind, task, step),
      decide: (input: DecideInput) => decideTask(session, input),
      deadman: (task: string, seconds: number | null) => setDeadman(session, task, seconds),
      session,
    }),
    [session],
  );
};

/** `[cancel, { loading }]` for one task. A refusal rejects. */
export const useCancelCall = (task: string): [() => Promise<void>, { loading: boolean }] => {
  const calls = useTaskCalls();
  const [loading, setLoading] = useState(false);
  const cancel = useCallback(async () => {
    setLoading(true);
    try {
      await calls.control("CANCEL", task);
    } finally {
      setLoading(false);
    }
  }, [calls, task]);
  return [cancel, { loading }];
};
