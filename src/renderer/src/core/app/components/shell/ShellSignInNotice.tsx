import { Arkitekt } from "@/core/app/Arkitekt";
import { Button } from "@/core/components/ui/button";
import { grantHintForProfile } from "@/core/lib/arkitekt/fakts/grantHint";
import { AlertTriangle, Loader2 } from "lucide-react";
import React from "react";

/**
 * Auto-login failed, and the app is staying where it is.
 *
 * The window belongs to an account the moment the profile book says so, so a
 * refused or unreachable token is not a reason to throw the shell away and go
 * back to the welcome screen — the user would lose their rail, their tabs and
 * their sense of where they are over something one button fixes. The notice
 * lives in the content card, over the (empty) page, with the chrome intact.
 *
 * Renders `null` whenever there is a connection or no error, so it costs
 * nothing on the happy path and disappears by itself: `connect` clears
 * `autoLoginError` on entry and `hydrateConnection` brings the connection up.
 *
 * The grant runs inline, like `AddProfileButton` and `ProfileCards` — the
 * dialog provider renders inside `Guard.Rekuest` and there is no rekuest here.
 */
export const ShellSignInNotice = () => {
  const autoLoginError = Arkitekt.useAutoLoginError();
  const connection = Arkitekt.useConnection();
  const profile = Arkitekt.useActiveProfile();
  const connect = Arkitekt.useConnect();
  const signOutProfile = Arkitekt.useSignOutProfile();

  const [busy, setBusy] = React.useState(false);
  const [retryError, setRetryError] = React.useState<string | null>(null);

  if (connection || !autoLoginError || !profile) return null;

  const organization =
    profile.label.organizationName ||
    profile.label.organizationSlug ||
    profile.label.deploymentName ||
    profile.identity.baseUrl;

  // `describeRefreshFailure` has already classified this: a profile is marked
  // stale only when the token endpoint actually refused it, so `stale` means
  // "sign in again" and anything else means "we could not reach the server".
  const expired = profile.status === "stale";

  const retry = async () => {
    setRetryError(null);
    setBusy(true);
    try {
      await connect({
        endpoint: profile.session.endpoint,
        controller: new AbortController(),
        // The page in the browser cannot know which of the user's accounts
        // just expired; the profile does. Preselect it.
        hint: grantHintForProfile(profile),
      });
    } catch (error) {
      setRetryError(
        error instanceof Error ? error.message : "Could not sign in to this account.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      data-testid="shell-signin-notice"
      className="absolute inset-0 z-10 flex items-center justify-center p-6"
    >
      <div className="w-full max-w-sm space-y-4 rounded-2xl border bg-background/95 p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
          <div className="min-w-0 space-y-1">
            <div className="text-sm font-medium">
              {expired
                ? `Your session for ${organization} expired.`
                : `Couldn't reach ${profile.label.deploymentName || profile.identity.baseUrl}.`}
            </div>
            <div className="text-xs text-muted-foreground">
              {retryError || profile.statusMessage || autoLoginError}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button className="rounded-xl" disabled={busy} onClick={() => void retry()}>
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Waiting for your browser…
              </>
            ) : (
              "Sign in again"
            )}
          </Button>
          {/* Not a link to Settings → Account: the routes are not mounted while
              this is up. Parking the profile is what hands the window back to
              the welcome screen and its list of accounts. */}
          <Button
            variant="ghost"
            className="rounded-xl text-muted-foreground"
            disabled={busy}
            onClick={() => void signOutProfile(profile.id)}
          >
            Choose another account
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ShellSignInNotice;
