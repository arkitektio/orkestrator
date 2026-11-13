import type { StructureInput } from "@/alpaka/api/graphql";
import { ActionFilter, DemandKind, PortKind } from "@/rekuest/api/graphql";

/**
 * What a room's replyers are asked about: the structure the conversation is
 * on. A replyer may take it beside the message (`replyer(message, image)`):
 * those are the specific ones, listed first and handed the structure.
 */

const MESSAGE = "@alpaka/message";

type Attached = { attachedStructures: readonly StructureInput[]; createdAt: string };

/**
 * The structure the next reply is about: what is staged in the composer, else
 * what the latest message carried, else what the room was opened about.
 * `messages` in any order; the latest by `createdAt` (ISO-8601) wins.
 */
export const replyerSubject = ({
  staged,
  messages,
  about,
}: {
  staged: readonly StructureInput[];
  messages: readonly Attached[];
  about: readonly StructureInput[];
}): StructureInput | undefined => {
  if (staged.length > 0) return staged[0];
  let latest: Attached | undefined;
  for (const message of messages) {
    if (message.attachedStructures.length === 0) continue;
    if (!latest || message.createdAt > latest.createdAt) latest = message;
  }
  return latest?.attachedStructures[0] ?? about[0];
};

const structureMatch = (identifier: string) => ({ kind: PortKind.Structure, identifier });

const answersMessages = {
  kind: DemandKind.Returns,
  matches: [structureMatch(MESSAGE)],
};

/** Every replyer: takes a message and answers with one. */
export const GENERIC_REPLYER_FILTER: ActionFilter = {
  demands: [{ kind: DemandKind.Args, matches: [structureMatch(MESSAGE)] }, answersMessages],
};

/** The replyers that also take a structure of the subject's kind, wherever that argument sits. */
export const specificReplyerFilter = (identifier: string): ActionFilter => ({
  demands: [
    { kind: DemandKind.Args, matches: [structureMatch(MESSAGE), structureMatch(identifier)] },
    answersMessages,
  ],
});

type Arg = { key: string; kind: PortKind; identifier?: string | null };

/** The argument a replyer takes the subject in: a structure of its kind, never the message. */
export const subjectArgKey = (
  args: readonly Arg[] | undefined,
  subject: Pick<StructureInput, "identifier"> | undefined,
  messageKey: string | undefined,
): string | undefined =>
  subject
    ? args?.find(
        (arg) =>
          arg.key !== messageKey &&
          arg.kind === PortKind.Structure &&
          arg.identifier === subject.identifier,
      )?.key
    : undefined;

/** Alpaka's numeric id as rekuest's wire form takes a structure. */
export const subjectWire = (subject: StructureInput) => ({
  __identifier: subject.identifier,
  object: String(subject.object),
});

/** The specific replyers, and the generic ones that are not among them, each in its own order. */
export const splitReplyers = <T extends { id: string }>(
  generic: readonly T[],
  specific: readonly T[],
): { specific: T[]; rest: T[] } => {
  const ids = new Set(specific.map((action) => action.id));
  return { specific: [...specific], rest: generic.filter((action) => !ids.has(action.id)) };
};

type ReplyerImplementation = {
  id: string;
  agent: { id: string; name?: string | null; connected?: boolean | null };
};

type ListedReplyer = {
  id: string;
  name: string;
  implementations?: readonly ReplyerImplementation[] | null;
};

/**
 * One entry of the replyer picker: an action, and the agent that runs it when
 * the choice is that specific.
 */
export type ReplyerOption<T> = {
  /** Unique in the picker: the action's id, with the implementation's when one is pinned. */
  id: string;
  action: T;
  /** The implementation the reply is assigned to, when several agents offer the action. Unset: rekuest picks one. */
  implementationId?: string;
  /** The agent behind it, whose state the arguments read their choices from. */
  agentId?: string;
  /** Shown beside the action's name when several agents offer it. */
  agentName?: string;
};

export const NO_REPLYER = "none";

/**
 * The picker's entries for `actions`. The same app running on two machines is
 * one action with two implementations, and which machine answers matters (its
 * models, its GPU): such an action is listed once per connected agent, and the
 * reply is assigned to that one. An action a single agent offers stays one
 * entry, bound to that agent so its arguments can read the agent's state.
 */
export const replyerOptions = <T extends ListedReplyer>(actions: readonly T[]): ReplyerOption<T>[] =>
  actions.flatMap((action): ReplyerOption<T>[] => {
    const connected = (action.implementations ?? []).filter(
      (implementation) => implementation.agent.connected,
    );
    if (connected.length === 0) return [{ id: action.id, action }];
    if (connected.length === 1) {
      const [only] = connected;
      return [{ id: action.id, action, agentId: only.agent.id }];
    }
    return connected.map((implementation) => ({
      id: `${action.id}@${implementation.id}`,
      action,
      implementationId: implementation.id,
      agentId: implementation.agent.id,
      agentName: implementation.agent.name ?? `agent ${implementation.agent.id}`,
    }));
  });
