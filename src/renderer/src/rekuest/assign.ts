import { AgentKind, AssignInput } from "./api/graphql";

/**
 * `AssignInput` still carries one required flag (`capture`). This fills a
 * conservative default so call sites only need to specify it when they
 * actually want the task captured.
 *
 * The old `cached` / `ephemeral` / `log` flags were removed from the API —
 * `ephemeral` in particular is superseded by the probe path (`useProbe`),
 * which is genuinely zero-persistence.
 */
export const buildAssignInput = (
  input: Omit<AssignInput, "capture"> & Partial<Pick<AssignInput, "capture">>,
): AssignInput => ({
  capture: false,
  ...input,
});

type WorkingAgent = { kind?: AgentKind | null; active?: boolean | null };

/** An agent can take work now: takt's rule (a webhook, or live). */
export const canTakeWork = (agent: WorkingAgent) => agent.kind === AgentKind.Webhook || Boolean(agent.active);

/** What of an action says where a run of it may go. */
export type TargetableAction = {
  id: string;
  stateful: boolean;
  implementations: readonly { id: string; agent: WorkingAgent }[];
};

/** The one implementation that can take the action now; undefined for none or several. */
export const soleLiveImplementation = (action: Pick<TargetableAction, "implementations">): string | undefined => {
  const live = action.implementations.filter((implementation) => canTakeWork(implementation.agent));
  return live.length === 1 ? live[0].id : undefined;
};

/**
 * What a run started without the assign form is sent to. A stateful action
 * keeps its state on one agent, and the server refuses it by action alone, even
 * with one implementation: it goes to the one that can take it now. Null when
 * that is not one: the caller asks which (the assign form, "Run on"). A
 * stateless action goes by action, and the server picks.
 */
export const directAssignTarget = (
  action: TargetableAction,
): { action: string } | { implementation: string } | null => {
  if (!action.stateful) return { action: action.id };
  const sole = soleLiveImplementation(action);
  return sole ? { implementation: sole } : null;
};
