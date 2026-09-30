import { describeRoles, RoleGuard, type RoleRequirement } from "@/core/connection/roles";
import { useActiveProfile } from "@/core/connection/arkitekt/hooks";
import type { ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";

/**
 * What a role-gated route shows to someone without the role: a deep link or a
 * restored tab lands here instead of on a blank page or a 404.
 */
export const NotPermitted = ({ roles }: { roles: RoleRequirement }) => {
  const location = useLocation();
  const organization = useActiveProfile()?.label.organizationName;

  return (
    <div className="flex h-full w-full flex-col items-center justify-center p-6">
      <div className="flex w-full max-w-[720px] flex-col gap-4">
        <div className="text-sm uppercase tracking-widest text-muted-foreground">Not permitted</div>
        <h1 className="text-2xl font-light tracking-tighter text-foreground sm:text-3xl">
          This page needs the {describeRoles(roles)} role
          {organization ? ` in ${organization}` : ""}.
        </h1>
        <div className="rounded-md border border-border bg-muted/40 px-4 py-3 font-mono text-sm break-all text-muted-foreground">
          {location.pathname}
        </div>
        <p className="text-sm text-muted-foreground">
          Ask an administrator of the organization for the role, or switch to an organization where you have it.
        </p>
        <NavLink to="/" className="text-sm text-primary underline-offset-4 hover:underline">
          Back to the dashboard
        </NavLink>
      </div>
    </div>
  );
};

/**
 * A route only for users with `roles`, for a module's own sub-routes:
 *
 * ```tsx
 * <Route path="approvals" element={<RoleRoute roles="admin"><ApprovalsPage /></RoleRoute>} />
 * ```
 *
 * Quiet while the roles are still unknown, so a warm boot does not flash the
 * "not permitted" page before `mycontext` answers.
 */
export const RoleRoute = ({ roles, children }: { roles?: RoleRequirement; children: ReactNode }) =>
  roles === undefined ? (
    <>{children}</>
  ) : (
    <RoleGuard require={roles} fallback={<NotPermitted roles={roles} />} pending={null}>
      {children}
    </RoleGuard>
  );

export default NotPermitted;
