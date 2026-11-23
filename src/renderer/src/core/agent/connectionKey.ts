/**
 * What an agent is bound to: the active login and its hub. `null` while there
 * is no connection. Keyed on the hub alone, a switch to another login on the
 * same hub kept the old agent: its socket and journal were the old login's, and
 * its next REGISTER (with the new token) was refused until it gave up.
 */
export const agentConnectionKey = (state: {
  profileBook: { activeProfileId: string | null };
  connection?: { endpoint?: { base_url?: string } | null } | null;
}): string | null => {
  const hub = state.connection?.endpoint?.base_url;
  if (!hub) return null;
  return `${state.profileBook.activeProfileId ?? "none"}|${hub}`;
};
