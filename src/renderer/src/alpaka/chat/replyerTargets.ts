import { canTakeWork, directAssignTarget, type TargetableAction } from "@/rekuest/assign";
import type { ReplyerImplementationFragment } from "@/rekuest/api/graphql";

/**
 * Which implementation of a replyer answers a room: the app that runs it, and
 * where (its agent, on its device). The picker offers each one; the chat
 * assigns to the one picked.
 */

export type ReplyerImplementation = ReplyerImplementationFragment;

export type ReplyerChoice = {
  id: string;
  name: string;
  stateful: boolean;
  implementations: readonly ReplyerImplementation[];
};

/** What the chat has picked: a replyer and, when one is named, the implementation that answers. */
export type ReplyerSelection = { action: string; implementation?: string };

/** The implementations of a replyer, the ones that can answer now first, each side in its own order. */
export const orderedImplementations = (
  action: Pick<ReplyerChoice, "implementations">,
): ReplyerImplementation[] => {
  const live = action.implementations.filter((implementation) => canTakeWork(implementation.agent));
  const idle = action.implementations.filter((implementation) => !canTakeWork(implementation.agent));
  return [...live, ...idle];
};

/**
 * What the chat picks for the user: the first replyer with an implementation
 * that can answer now, and that implementation; else the first replyer, with
 * none named (the server, or the assign form, decides).
 */
export const firstReplyerSelection = (
  actions: readonly ReplyerChoice[],
): ReplyerSelection | undefined => {
  for (const action of actions) {
    const live = action.implementations.find((implementation) => canTakeWork(implementation.agent));
    if (live) return { action: action.id, implementation: live.id };
  }
  return actions[0] ? { action: actions[0].id } : undefined;
};

/**
 * Where a reply is sent: the implementation picked, while the replyer still
 * has it; else as a run started without the form would go
 * (`directAssignTarget`), null when the user has to say which.
 */
export const replyerAssignTarget = (
  action: TargetableAction,
  implementation: string | undefined,
): { action: string } | { implementation: string } | null => {
  if (implementation && action.implementations.some((candidate) => candidate.id === implementation)) {
    return { implementation };
  }
  return directAssignTarget(action);
};

/** The app an implementation belongs to, as `identifier vVERSION`. */
export const implementationApp = (implementation: ReplyerImplementation): string =>
  `${implementation.agent.app.identifier} v${implementation.agent.release.version}`;

/** The agent's name, when it says more than the app's identifier does. */
export const implementationAgentName = (implementation: ReplyerImplementation): string | undefined =>
  implementation.agent.name && implementation.agent.name !== implementation.agent.app.identifier
    ? implementation.agent.name
    : undefined;

/** Whether a search matches a replyer by its name, or one of its implementations by app or agent. */
export const replyerMatches = (action: ReplyerChoice, search: string): boolean => {
  if (!search) return true;
  const needle = search.toLowerCase();
  return (
    action.name.toLowerCase().includes(needle) ||
    action.implementations.some(
      (implementation) =>
        implementation.agent.app.identifier.toLowerCase().includes(needle) ||
        implementation.agent.name.toLowerCase().includes(needle),
    )
  );
};
