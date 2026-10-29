import * as React from "react";
import { Arkitekt } from "@/core/connection/arkitekt/host";
import type { BlokViewer } from "@arkitektio/bsx/renderer/runtime/viewer";

/**
 * `viewer`: who is looking, as the active profile's own token says it
 * (vocabulary `records.viewer`): the user, the organization and the roles in
 * it. Nothing beyond what the viewer's token already tells them.
 */
export const useBlokViewer = (): BlokViewer | null => {
  const profile = Arkitekt.useActiveProfile();
  const userId = profile?.identity.userId ?? null;
  const username = profile?.label.username ?? null;
  const orgId = profile?.identity.organizationId ?? null;
  const roles = profile?.label.roles;
  const rolesKey = (roles ?? []).join("\u0000");
  return React.useMemo(
    () =>
      userId
        ? {
            user: { id: userId, username },
            org: orgId ? { id: orgId } : null,
            roles: rolesKey ? rolesKey.split("\u0000") : [],
          }
        : null,
    [orgId, rolesKey, userId, username],
  );
};
