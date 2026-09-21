import { MessageAgentFragment } from "./api/graphql";

/**
 * An agent is a client sitting in a room on behalf of a user, so it has two
 * names: the one the client registered itself under (`name`) and the human
 * behind it (`user.preferredUsername`). Nothing in the UI should ever read
 * "Agent 42" — a row is either a person or a named bot.
 */
export type NameableAgent = Pick<MessageAgentFragment, "id" | "name"> & {
  user?: { preferredUsername?: string | null } | null;
};

/** The name every desktop client registers itself under. */
export const DEFAULT_AGENT_NAME = "default";

const clean = (value: string | null | undefined) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

/**
 * Who a message is from.
 *
 * A bot picks its own `name` when it joins ("ollama", "claude-replyer"), so
 * that name wins. The desktop app joins as `default`, which says nothing, so
 * those rows fall back to the user behind the agent. `fallback` covers the
 * agent that has neither — a service with no user attached.
 */
export const agentDisplayName = (
  agent: NameableAgent | null | undefined,
  fallback = "Unknown",
) => {
  if (!agent) {
    return fallback;
  }

  const name = clean(agent.name);
  if (name && name !== DEFAULT_AGENT_NAME) {
    return name;
  }

  return clean(agent.user?.preferredUsername) ?? name ?? fallback;
};

/** Up to two letters for an avatar that has no image. */
export const displayInitials = (name: string | null | undefined, fallback = "?") => {
  const words = name?.trim().split(/[\s._-]+/).filter(Boolean) ?? [];

  if (words.length === 0) {
    return fallback;
  }

  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }

  return (words[0][0] + words[1][0]).toUpperCase();
};
