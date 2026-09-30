import type { ComponentProps, ComponentType } from "react";

import type { RoleRequirement } from "@/core/connection/roles";

const NEEDS = Symbol.for("orkestrator.dialogNeeds");
const ROLES = Symbol.for("orkestrator.dialogRoles");

type Tagged = { [NEEDS]?: readonly string[]; [ROLES]?: RoleRequirement };

/**
 * Wraps `Dialog` in a pass-through carrying `tag`. The tags of an already
 * wrapped dialog are kept, so `needsServices` and `needsRoles` compose in
 * either order.
 */
const tagged = <C extends ComponentType<any>>(Dialog: C, name: string, tag: Tagged): C => {
  const Needing = (props: ComponentProps<C>) => <Dialog {...props} />;
  Needing.displayName = `${name}(${Dialog.displayName ?? Dialog.name ?? "Dialog"})`;
  const inner = Dialog as unknown as Tagged;
  Object.assign(Needing, { [NEEDS]: inner[NEEDS], [ROLES]: inner[ROLES] }, tag);
  return Needing as unknown as C;
};

/**
 * A dialog that also needs another module's service, beyond its own:
 * kabinet's install dialog runs its deployer through rekuest.
 *
 * ```ts
 * installrelease: needsServices(["rekuest"], InstallReleaseDialog),
 * ```
 *
 * The host guards each dialog by its own module's service plus exactly
 * these, so a module's other dialogs keep working while that service is
 * down. Each one must also be in the manifest's `requires.services` (the
 * module-boundary edge), or the module is refused at registration.
 */
export const needsServices = <C extends ComponentType<any>>(services: readonly string[], Dialog: C): C =>
  tagged(Dialog, `Needs(${services.join(",")})`, { [NEEDS]: [...services] });

/** The services beyond its own module's that `Dialog` declared with `needsServices`. */
export const dialogNeeds = (Dialog: unknown): readonly string[] =>
  (Dialog as Tagged | null)?.[NEEDS] ?? [];

/**
 * A dialog only for users with these roles (`core/connection/roles`):
 *
 * ```ts
 * createinvite: needsRoles("admin", CreateInviteDialog),
 * ```
 *
 * The host mounts it behind a `RoleGuard`, so its queries never run for
 * anyone else, and says which role is missing instead. Hide the action that
 * opens it with the same `roles`.
 */
export const needsRoles = <C extends ComponentType<any>>(roles: RoleRequirement, Dialog: C): C =>
  tagged(Dialog, "NeedsRoles", { [ROLES]: roles });

/** The roles `Dialog` declared with `needsRoles`, if any. */
export const dialogRoles = (Dialog: unknown): RoleRequirement | undefined =>
  (Dialog as Tagged | null)?.[ROLES];
