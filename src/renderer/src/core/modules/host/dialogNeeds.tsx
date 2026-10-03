import type { ComponentProps, ComponentType } from "react";

import type { RoleRequirement } from "@/core/connection/roles";
import type { DialogSize } from "@/core/dialogs/DialogProvider";

const NEEDS = Symbol.for("orkestrator.dialogNeeds");
const ROLES = Symbol.for("orkestrator.dialogRoles");
const SIZE = Symbol.for("orkestrator.dialogSize");

type Tagged = { [NEEDS]?: readonly string[]; [ROLES]?: RoleRequirement; [SIZE]?: DialogSize };

/**
 * Wraps `Dialog` in a pass-through carrying `tag`. The tags of an already
 * wrapped dialog are kept, so `needsServices` and `needsRoles` compose in
 * either order.
 */
const tagged = <C extends ComponentType<any>>(Dialog: C, name: string, tag: Tagged): C => {
  const Needing = (props: ComponentProps<C>) => <Dialog {...props} />;
  Needing.displayName = `${name}(${Dialog.displayName ?? Dialog.name ?? "Dialog"})`;
  const inner = Dialog as unknown as Tagged;
  Object.assign(Needing, { [NEEDS]: inner[NEEDS], [ROLES]: inner[ROLES], [SIZE]: inner[SIZE] }, tag);
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

/**
 * The size a dialog opens at when its caller names none: the dialog knows
 * what it holds (a stacked form, a workspace), its many callers should not
 * each have to.
 *
 * ```ts
 * actionassign: prefersSize("medium", ActionAssignForm),
 * ```
 */
export const prefersSize = <C extends ComponentType<any>>(size: DialogSize, Dialog: C): C =>
  tagged(Dialog, "Sized", { [SIZE]: size });

/** The size `Dialog` declared with `prefersSize`, if any. */
export const dialogPreferredSize = (Dialog: unknown): DialogSize | undefined =>
  (Dialog as Tagged | null)?.[SIZE];

/** Carries a dialog's declared size onto the component the host wraps it in. */
export const keepPreferredSize = <C,>(from: unknown, to: C): C => {
  const size = dialogPreferredSize(from);
  if (size) Object.assign(to as object, { [SIZE]: size });
  return to;
};
