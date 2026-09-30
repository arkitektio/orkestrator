import { useActiveProfile } from "@/core/connection/arkitekt/hooks";

/**
 * Who is signed in, as the host knows it: the active profile's identity,
 * written from lok's `mycontext` at admission (`ProfileIdentitySync`).
 *
 * Modules read the signed-in user here instead of querying lok themselves:
 * the session is the host's, not a module's.
 */
export const useSelf = () => {
  const profile = useActiveProfile();
  return {
    /** lok user id (a user's `sub`); null until the first `mycontext`. */
    userId: profile?.identity.userId ?? null,
    username: profile?.label.username ?? null,
    /**
     * The user's REAL roles in the active organization; null until known.
     * Gate UI with `useRoles` / `RoleGuard` (`core/connection/roles`), which
     * also honours the developer "view as" override.
     */
    roles: profile?.label.roles ?? null,
  };
};
