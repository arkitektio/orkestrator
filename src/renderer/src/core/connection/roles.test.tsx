// @vitest-environment jsdom
import { act, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

// The active profile's cached label; `undefined` roles = not known yet.
let labelRoles: string[] | undefined;
vi.mock("@/core/connection/arkitekt/hooks", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/core/connection/arkitekt/hooks")>()),
  useActiveProfile: () => ({ label: { roles: labelRoles } }),
}));
// Real serviceGuard would need connection state; every service is ready here.
vi.mock("@/core/connection/arkitekt/host", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/core/connection/arkitekt/host")>()),
  serviceGuard:
    () =>
    ({ children }: { children: ReactNode }) =>
      <>{children}</>,
}));

import { routeCatalog, searchRoutes } from "@/core/command/sources/routeCatalog";
import { defineModule } from "@/core/modules/host/define";
import { needsRoles, needsServices, dialogNeeds, dialogRoles } from "@/core/modules/host/dialogNeeds";
import { registerModule, resetModuleHost } from "@/core/modules/host/host";
import { isModuleAllowed, MODULE_DIALOGS, pageSectionsFor } from "@/core/modules/registries";
import { getActionsForState } from "@/core/smart/localactions/LocalActionProvider";
import { Dialog, DialogContent } from "@/core/ui/dialog";
import {
  currentRoles,
  RoleGuard,
  resetRoles,
  RolesBridge,
  satisfiesRoles,
  setRoleOverride,
  useRoles,
} from "./roles";

/** The profile's cached roles, mirrored into the role store as the app does. */
const signIn = (roles: string[]) => {
  labelRoles = roles;
  render(<RolesBridge />);
};

afterEach(() => {
  labelRoles = undefined;
  act(() => resetRoles());
  resetModuleHost();
});

describe("satisfiesRoles", () => {
  it.each([
    [["admin"], undefined, true],
    [[], undefined, true],
    [["admin"], "admin", true],
    [["member"], "admin", false],
    [["member"], ["admin", "member"], true],
    [["member"], [], false],
    [["member"], { anyOf: ["admin", "member"] }, true],
    [["approver"], { allOf: ["approver", "auditor"] }, false],
    [["approver", "auditor"], { allOf: ["approver", "auditor"] }, true],
    // admin passes every requirement
    [["admin"], "approver", true],
    [["admin"], { allOf: ["approver", "auditor"] }, true],
    [["admin"], [], true],
    [[], { allOf: [] }, true],
  ] as const)("%j meets %j → %s", (have, requirement, expected) => {
    expect(satisfiesRoles(have, requirement)).toBe(expected);
  });
});

describe("RoleGuard", () => {
  it("never mounts its child for a user without the role", () => {
    signIn(["member"]);
    const mounted = vi.fn();
    const Child = () => {
      mounted();
      return <span>secret</span>;
    };
    render(
      <RoleGuard require="admin" fallback={<span>nope</span>}>
        <Child />
      </RoleGuard>,
    );
    expect(mounted).not.toHaveBeenCalled();
    expect(screen.getByText("nope")).toBeTruthy();
  });

  it("renders its child for a user with the role", () => {
    signIn(["admin"]);
    render(
      <RoleGuard require="admin">
        <span>secret</span>
      </RoleGuard>,
    );
    expect(screen.getByText("secret")).toBeTruthy();
  });

  it("shows `pending` while the roles are not known", () => {
    render(
      <RoleGuard require="admin" fallback={<span>nope</span>} pending={<span>wait</span>}>
        <span>secret</span>
      </RoleGuard>,
    );
    expect(screen.getByText("wait")).toBeTruthy();
  });
});

describe("view-as override", () => {
  const Probe = () => {
    const { roles, overridden } = useRoles();
    return <span>{`${overridden ? "as" : "real"}:${roles.join(",")}`}</span>;
  };

  it("takes precedence over the real roles, and clears back to them", () => {
    signIn(["admin"]);
    render(<Probe />);
    expect(screen.getByText("real:admin")).toBeTruthy();
    act(() => setRoleOverride([]));
    expect(screen.getByText("as:")).toBeTruthy();
    act(() => setRoleOverride(null));
    expect(screen.getByText("real:admin")).toBeTruthy();
  });

  it("reaches readers outside React through the bridge", () => {
    signIn(["admin"]);
    expect(currentRoles()).toEqual(["admin"]);
    act(() => setRoleOverride(["member"]));
    expect(currentRoles()).toEqual(["member"]);
  });
});

const module = (namespace: string, extra: Partial<Parameters<typeof defineModule>[0]> = {}) =>
  defineModule({
    manifest: { schema: 1, namespace, service: `io.test.${namespace}`, version: "0.1.0", label: namespace, models: [] },
    serviceKey: namespace,
    builtins: { page: async () => ({ default: () => null }) },
    ...extra,
  });

describe("host filtering", () => {
  it("drops a gated module and gated nav links from the catalog", () => {
    registerModule(
      module("ledger", {
        builtins: {
          page: async () => ({ default: () => null }),
          navLinks: [
            { label: "Accounts", route: "/ledger/accounts" },
            { label: "Audit", route: "/ledger/audit", roles: "admin" },
          ],
        },
      }),
    );
    registerModule(
      module("vault", {
        roles: "admin",
        builtins: { page: async () => ({ default: () => null }), navLinks: [{ label: "Keys", route: "/vault/keys" }] },
      }),
    );
    const ready = [{ key: "ledger" }, { key: "vault" }];
    const labels = (roles: string[]) => searchRoutes(routeCatalog(), ready, "a", 10, roles).map((r) => r.label).sort();

    // "a" matches Accounts, Audit (and Keys via "vault").
    expect(labels(["member"])).toEqual(["Accounts"]);
    expect(labels(["admin"])).toEqual(["Accounts", "Audit", "Keys"]);
    expect(isModuleAllowed("vault", [])).toBe(false);
    expect(isModuleAllowed("ledger", [])).toBe(true);
  });

  it("drops gated page sections", () => {
    const Component = () => null;
    registerModule(
      module("ledger", {
        builtins: {
          page: async () => ({ default: () => null }),
          pageSections: [
            { id: "ledger.open", title: "Open", placement: "sidebar", match: {}, Component },
            { id: "ledger.admin", title: "Admin", placement: "sidebar", match: {}, Component, roles: "admin" },
          ],
        },
      }),
    );
    const ids = (roles: string[]) => pageSectionsFor("@x/a", { placement: "sidebar" }, false, roles).map((s) => s.id);
    expect(ids([])).toEqual(["ledger.open"]);
    expect(ids(["admin"])).toEqual(["ledger.open", "ledger.admin"]);
  });

  it("drops gated local actions", () => {
    const execute = async () => undefined;
    const registry = {
      open: { title: "Open", description: "", conditions: [], execute },
      purge: { title: "Purge", description: "", conditions: [], roles: "admin", execute },
    };
    const state = { left: [], isCommand: false };
    expect(getActionsForState(registry, state, []).map((a) => a.title)).toEqual(["Open"]);
    expect(getActionsForState(registry, state, ["admin"]).map((a) => a.title)).toEqual(["Open", "Purge"]);
  });
});

describe("needsRoles", () => {
  it("composes with needsServices in either order", () => {
    const Dialog = () => null;
    const a = needsRoles("admin", needsServices(["engine"], Dialog));
    const b = needsServices(["engine"], needsRoles("admin", Dialog));
    for (const tagged of [a, b]) {
      expect(dialogRoles(tagged)).toBe("admin");
      expect(dialogNeeds(tagged)).toEqual(["engine"]);
    }
  });

  it("says which role is missing instead of mounting the dialog", () => {
    signIn(["member"]);
    const mounted = vi.fn();
    const Invite = () => {
      mounted();
      return <span>invite</span>;
    };
    registerModule(
      module("team", {
        builtins: { page: async () => ({ default: () => null }), dialogs: { invite: needsRoles("admin", Invite) } },
      }),
    );
    const Component = (MODULE_DIALOGS as Record<string, React.ComponentType<object>>).invite;
    render(
      <Dialog open>
        <DialogContent>
          <Component />
        </DialogContent>
      </Dialog>,
    );
    expect(mounted).not.toHaveBeenCalled();
    expect(screen.getByText("Not permitted")).toBeTruthy();
  });
});
