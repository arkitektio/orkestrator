import type { MembershipFilter } from "../api/graphql";

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

/** Members holding any of these roles; undefined for none. */
export const anyRole = (ids: readonly string[]): MembershipFilter | undefined =>
  ids.reduceRight<MembershipFilter | undefined>(
    (rest, id) => ({ role: id, ...(rest ? { OR: rest } : {}) }),
    undefined,
  );

/** One group of the Team page, as the server's filter that picks its members. */
export type RoleGroupQuery = {
  /** Null: the members holding none of the organization's roles. */
  role: TeamRole | null;
  filters: MembershipFilter;
};

/**
 * One group per role, each member ONCE, under the highest role they hold (the
 * card still lists every role): a role's group is its holders that hold none
 * of the roles above it. Members without a role close the list. Each group is
 * asked of the server on its own, paginated and counted, so it is right however
 * many members there are; a group that comes back empty is not drawn.
 *
 * `search` reads usernames (`MembershipFilter.search`). `role`, when given,
 * keeps only its holders, all of them under that role.
 */
export const roleGroupFilters = (
  roles: readonly TeamRole[],
  { query = "", role: only = null }: { query?: string; role?: string | null } = {},
): RoleGroupQuery[] => {
  const needle = query.trim();
  const search: MembershipFilter = needle ? { search: needle } : {};
  if (only !== null) {
    const picked = roles.find((role) => role.id === only);
    return picked ? [{ role: picked, filters: { role: picked.id, ...search } }] : [];
  }
  const ordered = orderRoles(roles);
  const groups: RoleGroupQuery[] = ordered.map((role, index) => {
    const above = anyRole(ordered.slice(0, index).map((higher) => higher.id));
    return { role, filters: { role: role.id, ...(above ? { NOT: above } : {}), ...search } };
  });
  const anyOf = anyRole(ordered.map((role) => role.id));
  groups.push({ role: null, filters: { ...(anyOf ? { NOT: anyOf } : {}), ...search } });
  return groups;
};

/**
 * Within a group's loaded members: you first, the rest in the server's order
 * (by username, `MembershipOrdering.username`), so "Show more" continues it.
 */
export const sortMembers = <M extends TeamMember>(members: readonly M[], me?: string | null): M[] => [
  ...members.filter((member) => member.user.id === me),
  ...members.filter((member) => member.user.id !== me),
];
