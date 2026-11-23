/**
 * What an agent is bound to: the login, its hub, and the address its rekuest answered on.
 * `null` until all three are known, so no agent starts half way through a switch.
 *
 * Every part comes from ONE write of the store (a connection going live sets the session and
 * the connection together; rekuest's address arrives when its check passes). The active
 * profile id is not used: a switch writes it before the new connection exists, and an agent
 * keyed on it was built against the OLD hub's address while the new hub's token was pushed
 * into it, so it registered on one hub's takt with another's token (refused with 3003).
 *
 * Keyed on the hub alone, a switch to another login on the same hub kept the old agent: its
 * socket and journal were the old login's. The login is the session's token chain
 * (`client_id`), which a token refresh keeps.
 */
export const agentConnectionKey = (state: {
  storedSession?: { token?: { client_id?: string | null } | null } | null;
  connection?: {
    endpoint?: { base_url?: string } | null;
    aliasMap?: Record<string, { host: string; port?: number | null; path?: string | null } | undefined>;
  } | null;
}): string | null => {
  const hub = state.connection?.endpoint?.base_url;
  const rekuest = state.connection?.aliasMap?.rekuest;
  if (!hub || !rekuest) return null;
  const login = state.storedSession?.token?.client_id ?? "none";
  return `${login}|${hub}|${rekuest.host}:${rekuest.port ?? ""}${rekuest.path ?? ""}`;
};

/** Whether `context` is the connection an agent was built for (a token refresh of it). */
export const sameAgentConnection = (
  built: string | null,
  context: Parameters<typeof agentConnectionKey>[0],
): boolean => built !== null && agentConnectionKey(context) === built;
