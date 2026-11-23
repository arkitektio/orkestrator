import type { ApolloClient } from "@apollo/client";
import { useCallback, useMemo, useState } from "react";
import {
  CancelDocument,
  DecideDocument,
  InterruptDocument,
  PauseDocument,
  ResumeDocument,
  type DecideInput,
} from "../api/graphql";
import { useRekuest } from "../api/hooks";
import type { RekuestSession } from "./client";
import { sourceOf, useRekuestSession } from "./hooks";

/**
 * What a person asks of a task, over the window's caller session (takt
 * `/session`: the call's answer comes back on the same socket, and one re-sent
 * after a drop is applied once) while there is one, else as the GraphQL
 * mutation it always was. Either way a refusal rejects, with the server's
 * sentence; the caller reports it (CLAUDE.md §8).
 */

export type TaskControlKind = "CANCEL" | "INTERRUPT" | "PAUSE" | "RESUME";

/** The caller session beside a rekuest service (a local action's `services.rekuest`). */
export const sessionOf = (service: unknown): RekuestSession | undefined =>
  (service as { session?: RekuestSession } | undefined)?.session;

/** How long a window may be gone before a run tied to it is cancelled, unless chosen. */
export const DEFAULT_DEADMAN_SECONDS = 60;

/** Whether calls go over the session right now. */
export const overSession = (session: RekuestSession | null | undefined): session is RekuestSession =>
  !!session && sourceOf(session.getStatus()) === "session";

const CONTROL_DOCUMENTS = {
  CANCEL: CancelDocument,
  INTERRUPT: InterruptDocument,
  PAUSE: PauseDocument,
  RESUME: ResumeDocument,
} as const;

/** Cancel, interrupt, pause or resume (`step`: to the next pausepoint) a task. */
export const controlTask = async (
  apollo: ApolloClient<any>,
  session: RekuestSession | null | undefined,
  kind: TaskControlKind,
  task: string,
  step = false,
): Promise<void> => {
  if (overSession(session)) {
    await session.call(kind === "RESUME" ? { type: kind, task, step } : { type: kind, task });
    return;
  }
  const input = kind === "RESUME" ? { task, step } : { task };
  await apollo.mutate({ mutation: CONTROL_DOCUMENTS[kind], variables: { input } });
};

/** Answer a held task. */
export const decideTask = async (
  apollo: ApolloClient<any>,
  session: RekuestSession | null | undefined,
  input: DecideInput,
): Promise<void> => {
  if (overSession(session)) {
    await session.call({
      type: "DECIDE",
      task: input.task,
      approved: input.approved,
      answer: input.answer ?? null,
      values: (input.values as Record<string, unknown> | null | undefined) ?? null,
      remember: input.remember ?? null,
    });
    return;
  }
  await apollo.mutate({ mutation: DecideDocument, variables: { input } });
};

/**
 * Tie a task to this window (the dead man switch: cancelled once the window has been gone
 * `seconds`), or untie it (`null`). Only over the session: there is no window without one.
 */
export const setDeadman = async (
  session: RekuestSession | null | undefined,
  task: string,
  seconds: number | null,
): Promise<void> => {
  if (!overSession(session)) {
    throw new Error("Tying a task to this window needs a live session with the server.");
  }
  await session.call({ type: "DEADMAN", task, seconds });
};

/** The calls above, bound to this window's client and session. */
export const useTaskCalls = () => {
  const apollo = useRekuest();
  const session = useRekuestSession();
  return useMemo(
    () => ({
      control: (kind: TaskControlKind, task: string, step = false) =>
        controlTask(apollo, session, kind, task, step),
      decide: (input: DecideInput) => decideTask(apollo, session, input),
      deadman: (task: string, seconds: number | null) => setDeadman(session, task, seconds),
      session,
    }),
    [apollo, session],
  );
};

/**
 * `[cancel, { loading }]` for one task, the shape `useCancelMutation` gave: over
 * the session while there is one. A refusal rejects.
 */
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
