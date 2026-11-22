import { describe, expect, it } from "vitest";

import { anyRole, orderRoles, roleGroupFilters, sortMembers, type TeamRole } from "./teamRoles";

const role = (id: string, flags: Partial<TeamRole> = {}): TeamRole => ({
  id,
  identifier: id,
  description: `${id} role`,
  isAdminRole: false,
  isDefaultRole: false,
  ...flags,
});

const ROLES = [
  role("member", { isDefaultRole: true }),
  role("curator"),
  role("admin", { isAdminRole: true }),
];

const member = (username: string, ...roles: string[]) => ({
  user: { id: username, username },
  roles: roles.map((id) => ({ id, identifier: id })),
});

describe("orderRoles", () => {
  it("puts admin roles first and the default role last", () => {
    expect(orderRoles(ROLES).map((r) => r.id)).toEqual(["admin", "curator", "member"]);
  });
});

describe("roleGroupFilters", () => {
  it("asks for each role's holders that hold none of the roles above it, then those with no role", () => {
    const groups = roleGroupFilters(ROLES);
    expect(groups.map((group) => [group.role?.id ?? null, group.filters])).toEqual([
      ["admin", { role: "admin" }],
      ["curator", { role: "curator", NOT: { role: "admin" } }],
      ["member", { role: "member", NOT: { role: "admin", OR: { role: "curator" } } }],
      [null, { NOT: { role: "admin", OR: { role: "curator", OR: { role: "member" } } } }],
    ]);
  });

  it("searches every group by username", () => {
    for (const group of roleGroupFilters(ROLES, { query: " bo " })) {
      expect(group.filters.search).toBe("bo");
    }
  });

  it("with a role picked, asks for every holder under it", () => {
    expect(roleGroupFilters(ROLES, { role: "member", query: "cy" })).toEqual([
      { role: ROLES[0], filters: { role: "member", search: "cy" } },
    ]);
    expect(roleGroupFilters(ROLES, { role: "gone" })).toEqual([]);
  });

  it("with no roles at all, lists everyone in one group", () => {
    expect(roleGroupFilters([])).toEqual([{ role: null, filters: {} }]);
  });
});

describe("anyRole", () => {
  it("chains the roles with OR", () => {
    expect(anyRole([])).toBeUndefined();
    expect(anyRole(["a", "b"])).toEqual({ role: "a", OR: { role: "b" } });
  });
});

describe("sortMembers", () => {
  it("puts you first and keeps the server's order for the rest", () => {
    const sorted = sortMembers([member("bo", "member"), member("me", "member"), member("zed", "member")], "me");
    expect(sorted.map((m) => m.user.username)).toEqual(["me", "bo", "zed"]);
  });
});
