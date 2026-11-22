/**
 * The Team page's people, grouped by what they may do here. Pure, so the
 * placement rules are tested without a page.
 */

/** An organization's role, as the Team page reads it. */
export type TeamRole = {
  id: string;
  identifier: string;
  description: string;
  isAdminRole: boolean;
  isDefaultRole: boolean;
};

/** A member, as much of it as grouping needs. */
export type TeamMember = {
  roles: readonly { id: string; identifier: string }[];
  user: { id: string; username: string };
};

export type RoleGroup<M extends TeamMember> = {
  /** Null: the members holding none of the organization's roles. */
  role: TeamRole | null;
  members: M[];
};

/**
 * Admin roles first, then the organization's own order. The default role comes
 * last, since nearly everyone holds it and it says little.
 */
const rank = (role: TeamRole) => (role.isAdminRole ? 0 : role.isDefaultRole ? 2 : 1);

export const orderRoles = (roles: readonly TeamRole[]): TeamRole[] =>
  roles
    .map((role, index) => ({ role, index }))
    .sort((a, b) => rank(a.role) - rank(b.role) || a.index - b.index)
    .map(({ role }) => role);

/** Whether a member matches what was typed: their username or one of their roles. */
export const memberMatches = (member: TeamMember, query: string): boolean => {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return (
    member.user.username.toLowerCase().includes(needle) ||
    member.roles.some((role) => role.identifier.toLowerCase().includes(needle))
  );
};

/**
 * One group per role, each member ONCE, under the highest role they hold (the
 * card still lists every role). Members without a role close the list. Within
 * a group: you first, then by username. Empty groups are left out.
 *
 * `role`, when given, keeps only its holders, all of them under that role.
 */
export const groupMembersByRole = <M extends TeamMember>(
  memberships: readonly M[],
  roles: readonly TeamRole[],
  {
    me,
    query = "",
    role: only = null,
  }: { me?: string | null; query?: string; role?: string | null } = {},
): RoleGroup<M>[] => {
  const ordered = orderRoles(roles);
  const groups = new Map<string | null, M[]>();

  for (const member of memberships) {
    if (!memberMatches(member, query)) continue;
    const held = new Set(member.roles.map((role) => role.id));
    if (only !== null && !held.has(only)) continue;
    const home = only ?? ordered.find((role) => held.has(role.id))?.id ?? null;
    const group = groups.get(home);
    if (group) group.push(member);
    else groups.set(home, [member]);
  }

  const byMeThenName = (a: M, b: M) =>
    Number(b.user.id === me) - Number(a.user.id === me) ||
    a.user.username.localeCompare(b.user.username);

  return [...ordered, null]
    .map((role) => ({ role, members: (groups.get(role?.id ?? null) ?? []).sort(byMeThenName) }))
    .filter((group) => group.members.length > 0);
};
