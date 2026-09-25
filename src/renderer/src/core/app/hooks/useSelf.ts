import { useActiveProfile } from "@/core/lib/arkitekt/hooks";

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
  };
};
