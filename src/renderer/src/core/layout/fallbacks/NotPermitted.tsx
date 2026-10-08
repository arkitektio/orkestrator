import { describeRoles, RoleGuard, useRoles, type RoleRequirement } from "@/core/connection/roles";
import { ShieldOff } from "lucide-react";
import type { ReactNode } from "react";
import { StatusPage, type StatusDetail } from "./StatusPage";
import { BackButton, HomeButton, SwitchAccountButton, useStatusContext } from "./statusActions";

/**
 * What a role-gated route shows to someone without the role: a deep link or a
 * restored tab lands here instead of on a blank page or a 404.
 */
export const NotPermitted = ({ roles }: { roles: RoleRequirement }) => {
  const { organization, who } = useStatusContext();
  const { roles: mine, overridden } = useRoles();
  const needed = describeRoles(roles);

  const details: StatusDetail[] = [
    { label: "Needs", value: needed },
    { label: overridden ? "Viewing as" : "Your roles", value: mine.length > 0 ? mine.join(", ") : "none" },
    ...who,
  ];

  return (
    <StatusPage
      tone="warning"
      code={403}
      icon={ShieldOff}
      title={
        <>
          This page needs the {needed} role{organization ? ` in ${organization}` : ""}
        </>
      }
      description="You are signed in, but your membership in this organization doesn't include the role this page is limited to."
      hints={[
        <>
          Ask an administrator of {organization ?? "the organization"} to give your membership the{" "}
          <strong>{needed}</strong> role.
        </>,
        <>Roles are per organization: switch to one where you have it from the account menu in the sidebar.</>,
        ...(overridden
          ? [<>You are previewing with other roles (Settings → Developer → view as); reset it to see your own.</>]
          : []),
      ]}
      actions={
        <>
          <BackButton />
          <HomeButton />
          <SwitchAccountButton />
        </>
      }
      details={details}
    />
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
