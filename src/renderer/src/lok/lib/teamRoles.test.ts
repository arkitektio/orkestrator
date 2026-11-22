import { describe, expect, it } from "vitest";

import { groupMembersByRole, orderRoles, type TeamRole } from "./teamRoles";

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

const shape = (groups: ReturnType<typeof groupMembersByRole>) =>
  groups.map((group) => [group.role?.id ?? null, group.members.map((m) => m.user.username)]);

describe("orderRoles", () => {
  it("puts admin roles first and the default role last", () => {
    expect(orderRoles(ROLES).map((r) => r.id)).toEqual(["admin", "curator", "member"]);
  });
});

describe("groupMembersByRole", () => {
  it("places each member once, under their highest role", () => {
    const groups = groupMembersByRole(
      [member("ada", "member", "admin"), member("bo", "member", "curator"), member("cy", "member")],
      ROLES,
    );
    expect(shape(groups)).toEqual([
      ["admin", ["ada"]],
      ["curator", ["bo"]],
      ["member", ["cy"]],
    ]);
  });

  it("closes with the members holding no role, and drops empty groups", () => {
    const groups = groupMembersByRole([member("dee"), member("cy", "member")], ROLES);
    expect(shape(groups)).toEqual([
      ["member", ["cy"]],
      [null, ["dee"]],
    ]);
  });

  it("sorts you first, then by username", () => {
    const groups = groupMembersByRole(
      [member("zed", "member"), member("bo", "member"), member("me", "member")],
      ROLES,
      { me: "me" },
    );
    expect(shape(groups)).toEqual([["member", ["me", "bo", "zed"]]]);
  });

  it("filters on username and role identifier", () => {
    const people = [member("ada", "admin"), member("bo", "curator"), member("cy", "member")];
    expect(shape(groupMembersByRole(people, ROLES, { query: "BO" }))).toEqual([["curator", ["bo"]]]);
    expect(shape(groupMembersByRole(people, ROLES, { query: "cura" }))).toEqual([["curator", ["bo"]]]);
  });

  it("with a role picked, lists every holder under it", () => {
    const groups = groupMembersByRole(
      [member("ada", "member", "admin"), member("cy", "member"), member("dee")],
      ROLES,
      { role: "member" },
    );
    expect(shape(groups)).toEqual([["member", ["ada", "cy"]]]);
  });
});
