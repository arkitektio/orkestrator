import { useLayoutEffect, type ReactNode } from "react";
import { useStore } from "zustand";
import { createStore } from "zustand/vanilla";

import { useActiveProfile } from "@/core/connection/arkitekt/hooks";

/**
 * Role gates: what the signed-in user may SEE, by their roles in the active
 * organization (lok `mycontext.roles`, cached on the profile's label by
 * `ProfileIdentitySync`).
 *
 * Cosmetic only. Hiding a page is not protecting it — the backend enforces
 * every permission; this just keeps the UI from offering dead ends.
 *
 * A requirement is a role, a list (any of them), or `{ allOf }` / `{ anyOf }`.
 * Builtins declare it (`roles?` on a module, nav link, page section, local
 * action, menu section, settings section, `needsRoles` on a dialog) and the
 * host filters; modules do not check roles by hand.
 */
export type RoleRequirement =
  | string
  | readonly string[]
  | { readonly anyOf: readonly string[] }
  | { readonly allOf: readonly string[] };

/** The organization role that passes every requirement. */
export const ADMIN_ROLE = "admin";

/**
 * Whether `have` meets `requirement`. No requirement is always met, and an
 * `admin` meets every one (the "view as" override can drop it to preview).
 */
export const satisfiesRoles = (have: readonly string[], requirement?: RoleRequirement): boolean => {
  if (requirement === undefined) return true;
  if (have.includes(ADMIN_ROLE)) return true;
  if (typeof requirement === "string") return have.includes(requirement);
  if ("allOf" in requirement) return requirement.allOf.every((role) => have.includes(role));
  const anyOf = "anyOf" in requirement ? requirement.anyOf : (requirement as readonly string[]);
  return anyOf.some((role) => have.includes(role));
};

/** "admin", "admin or approver", "admin and approver" — for a fallback's copy. */
export const describeRoles = (requirement: RoleRequirement): string => {
  if (typeof requirement === "string") return requirement;
  if ("allOf" in requirement) return requirement.allOf.join(" and ");
  const anyOf = "anyOf" in requirement ? requirement.anyOf : (requirement as readonly string[]);
  return anyOf.join(" or ");
};

type RoleState = {
  /** The real roles, mirrored from the active profile by `RolesBridge`; null = unknown. */
  real: readonly string[] | null;
  /** Developer "view as": replaces the real roles for this window, this session. */
  override: readonly string[] | null;
};

const roleStore = createStore<RoleState>(() => ({ real: null, override: null }));

/** Set (or, with `null`, clear) the "view as" override. Never persisted. */
export const setRoleOverride = (roles: readonly string[] | null) =>
  roleStore.setState({ override: roles ? [...roles] : null });

export const useRoleOverride = () => useStore(roleStore, (state) => state.override);

const NO_ROLES: readonly string[] = [];

/**
 * The real roles: the active profile's cached label, as `RolesBridge` mirrors
 * it. Read from the role store, not the connection, so gated UI renders (as
 * "unknown") outside the Arkitekt provider too.
 */
export const useRealRoles = (): { roles: readonly string[]; known: boolean } => {
  const real = useStore(roleStore, (state) => state.real);
  return { roles: real ?? NO_ROLES, known: real !== null };
};

/**
 * The roles the UI gates on: the "view as" override when set, else the real
 * ones. `known` is false until the first `mycontext` of a profile that has
 * no cached roles yet; gated UI stays hidden (the guard's `pending`) until then.
 */
export const useRoles = (): { roles: readonly string[]; known: boolean; overridden: boolean } => {
  const real = useRealRoles();
  const override = useRoleOverride();
  if (override) return { roles: override, known: true, overridden: true };
  return { ...real, overridden: false };
};

/** Whether the user meets `requirement`; false while the roles are unknown. */
export const useHasRoles = (requirement?: RoleRequirement): boolean => {
  const { roles, known } = useRoles();
  if (requirement === undefined) return true;
  return known && satisfiesRoles(roles, requirement);
};

/**
 * The effective roles outside React (drop targets resolving actions). Empty
 * until `RolesBridge` has run, so a gated action is simply not offered.
 */
export const currentRoles = (): readonly string[] => {
  const { real, override } = roleStore.getState();
  return override ?? real ?? NO_ROLES;
};

/**
 * Mirrors the active profile's roles into the role store. Mount once, inside
 * the Arkitekt provider and before the app's children: a layout effect, so a
 * warm boot's cached roles land before the first paint (no gated-UI flash).
 */
export const RolesBridge = () => {
  const roles = useActiveProfile()?.label.roles;
  const key = roles?.join("\u0000");
  useLayoutEffect(() => {
    roleStore.setState({ real: roles ? [...roles] : null });
    // `key` stands in for the array: the label is re-read on every book write.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return null;
};

/** Resets the role store (tests). */
export const resetRoles = () => roleStore.setState({ real: null, override: null });

export type RoleGuardProps = {
  require?: RoleRequirement;
  children: ReactNode;
  /** Shown when the roles are known and do not meet `require`. */
  fallback?: ReactNode;
  /** Shown while the roles are not known yet; defaults to `fallback`. */
  pending?: ReactNode;
};

/**
 * Renders `children` only for a user who meets `require`. Wrap a component
 * from the OUTSIDE (CLAUDE.md §1): its queries then never fire for a user
 * who may not see it.
 */
export const RoleGuard = ({ require, children, fallback = null, pending }: RoleGuardProps) => {
  const { roles, known } = useRoles();
  if (require === undefined) return <>{children}</>;
  if (!known) return <>{pending === undefined ? fallback : pending}</>;
  return <>{satisfiesRoles(roles, require) ? children : fallback}</>;
};
