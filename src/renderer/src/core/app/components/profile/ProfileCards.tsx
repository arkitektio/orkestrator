import { Arkitekt } from "@/core/lib/arkitekt/host";
import { Button } from "@/core/components/ui/button";
import { Checkbox } from "@/core/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/core/components/ui/popover";
import { grantHintForProfile } from "@/core/lib/arkitekt/fakts/grantHint";
import type { StoredProfile } from "@/core/lib/arkitekt/fakts/profileStorageSchema";
import { describeRefreshFailure } from "@/core/lib/arkitekt/runtime/profileAuth";
import { cn } from "@/core/lib/utils";

import { ProfileBrandAvatar } from "./ProfileBrandAvatar";
import { profileDetail, profileShortDetail, profileTitle } from "./profileLabels";
import { AlertTriangle, Loader2, LogOut, Trash2 } from "lucide-react";
import React from "react";

/**
 * The logins this computer already holds, as a row of cards.
 *
 * Signed out is not the same as having no accounts: the profile book survives a
 * failed auto-login, a quit, and being offline, so the screen that greets the
 * user has to offer those parked logins before it offers a fresh grant.
 *
 * Reads the profile book and nothing else, exactly like `ProfileSwitcher` — no
 * query, no live connection — and paints from the cached label so an account
 * looks the same here and in the avatar menu. It cannot reuse `ProfileRow`,
 * which is built out of `DropdownMenuItem`s; and it cannot reach for
 * `useDialog`, since the dialog provider renders inside `Guard.Rekuest` and
 * there is no rekuest while we are signed out. A stale profile therefore
 * re-grants right here, through the same `connect` the plus button uses.
 *
 * Used on the welcome screen and on Settings → Account, which is what the
 * rail's "Manage accounts" points at — one component, so the two never drift.
 *
 * Renders a bare fragment of cards, not a container: the caller owns the row
 * so the plus button sits in it as the last card. The error is a `w-full`
 * item, which in a wrapping row means "own line underneath".
 */
export const ProfileCards = () => {
  const profiles = Arkitekt.useProfiles();
  const activeProfileId = Arkitekt.useActiveProfileId();
  const connection = Arkitekt.useConnection();
  const switchingProfileId = Arkitekt.useSwitchingProfileId();
  const switchProfile = Arkitekt.useSwitchProfile();
  const signOutProfile = Arkitekt.useSignOutProfile();
  const removeProfile = Arkitekt.useRemoveProfile();
  const connect = Arkitekt.useConnect();

  const [granting, setGranting] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const onContinue = React.useCallback(
    async (profile: StoredProfile, remember: boolean) => {
      setError(null);

      // A stale profile's refresh chain is already known broken — including the
      // one we broke ourselves by signing out — so proving it again would only
      // waste a round-trip: go straight to the grant.
      if (profile.status === "stale") {
        const controller = new AbortController();
        try {
          setGranting(profile.id);
          await connect({
            endpoint: profile.session.endpoint,
            controller,
            // Re-approving a known account: tell the configure page which one,
            // so the user is not asked to find themselves in a list.
            hint: grantHintForProfile(profile),
          });
        } catch (e) {
          setError(
            e instanceof Error ? e.message : "Could not sign in to this account.",
          );
        } finally {
          setGranting(null);
        }
        return;
      }

      try {
        await switchProfile(profile.id, { remember });
      } catch (e) {
        // `switchProfile` has already classified this and marked the profile,
        // so the message is the whole user-facing consequence.
        setError(describeRefreshFailure(e, profile).message);
      }
    },
    [connect, switchProfile],
  );

  return (
    <>
      {profiles.map((profile) => (
        <ProfileCard
          key={profile.id}
          profile={profile}
          active={profile.id === activeProfileId && Boolean(connection)}
          busy={profile.id === switchingProfileId || profile.id === granting}
          disabled={switchingProfileId !== null || granting !== null}
          onContinue={onContinue}
          onSignOut={signOutProfile}
          onRemove={removeProfile}
        />
      ))}

      {error && (
        <div className="flex w-full items-start justify-center gap-2 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </>
  );
};

/**
 * One parked login, as a card in the welcome screen's row.
 *
 * Clicking it opens its choices rather than signing straight in, because
 * "stay signed in" has to be asked BEFORE the switch — it decides whether the
 * profile is written back as the one the next launch auto-logs into — and
 * because this screen is the only place a parked account can be signed out or
 * forgotten while nothing is connected.
 */
const ProfileCard = ({
  profile,
  active,
  busy,
  disabled,
  onContinue,
  onSignOut,
  onRemove,
}: {
  profile: StoredProfile;
  active: boolean;
  busy: boolean;
  disabled: boolean;
  onContinue: (profile: StoredProfile, remember: boolean) => void;
  onSignOut: (profileId: string) => void;
  onRemove: (profileId: string) => void;
}) => {
  const [open, setOpen] = React.useState(false);
  const [remember, setRemember] = React.useState(true);
  const stale = profile.status === "stale";

  const title = profileTitle(profile);

  // A card has no room for two lines of detail, so it carries the one thing
  // that tells two cards of the same organization apart — the hub, falling back
  // to the account. The full line is in the popover.
  const subtitle = stale ? "Sign in again" : profileShortDetail(profile);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled && !busy}
          title={title}
          className={cn(
            "flex h-auto w-32 flex-col items-center justify-start gap-2 rounded-3xl px-3 py-4",
            active && "ring-2 ring-primary",
          )}
        >
          <div className="relative">
            <ProfileBrandAvatar
              profile={profile}
              className={cn(
                "h-12 w-12 rounded-full text-sm",
                stale && "opacity-40 grayscale",
              )}
            />
            {busy ? (
              <span className="absolute -bottom-0.5 -right-0.5 rounded-full bg-background p-0.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
              </span>
            ) : stale ? (
              <span className="absolute -bottom-0.5 -right-0.5 rounded-full bg-background p-0.5">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
              </span>
            ) : null}
          </div>

          <div className="w-full min-w-0">
            <div className={cn("truncate text-sm", stale && "text-muted-foreground")}>
              {title}
            </div>
            {subtitle && (
              <div
                className={cn(
                  "truncate text-[10px] font-normal",
                  stale
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-muted-foreground",
                )}
              >
                {subtitle}
              </div>
            )}
          </div>
        </Button>
      </PopoverTrigger>

      <PopoverContent align="center" className="w-72 rounded-2xl">
        <div className="space-y-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">{title}</div>
            <div className="truncate text-[11px] text-muted-foreground">
              {profileDetail(profile) || profile.identity.baseUrl}
            </div>
          </div>

          {!stale && !active && (
            <label className="flex cursor-pointer items-start gap-2 text-xs">
              <Checkbox
                checked={remember}
                onCheckedChange={(value) => setRemember(value === true)}
                className="mt-0.5"
              />
              <span>
                Stay signed in
                <span className="mt-0.5 block text-[10px] text-muted-foreground">
                  Otherwise this account is only signed in until you quit.
                </span>
              </span>
            </label>
          )}

          <Button
            className="w-full rounded-xl"
            disabled={busy || active}
            onClick={() => {
              setOpen(false);
              onContinue(profile, remember);
            }}
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : active ? (
              "Current account"
            ) : stale ? (
              "Sign in again"
            ) : (
              "Switch to this account"
            )}
          </Button>

          {/* The two things that are NOT a switch, each saying what it costs.
              Switching leaves the credential alone; signing out spends it, and
              coming back needs the browser again; removing forgets the login
              here for good. Told apart in words, because the difference is
              invisible in the moment and expensive to get wrong. */}
          <div className="space-y-1 border-t pt-2">
            {!stale && (
              <VerbButton
                icon={<LogOut className="h-3.5 w-3.5" />}
                label="Sign out"
                detail="Ends this session. Signing back in needs your browser."
                onClick={() => {
                  setOpen(false);
                  onSignOut(profile.id);
                }}
              />
            )}
            <VerbButton
              icon={<Trash2 className="h-3.5 w-3.5" />}
              label="Remove from this computer"
              detail="Forgets this login here. It stays valid on the server until it expires."
              destructive
              onClick={() => {
                setOpen(false);
                onRemove(profile.id);
              }}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

/**
 * One of the two non-switch verbs: what it is, and what it costs, on the line
 * underneath. A button rather than a menu item — the popover is not a menu, and
 * the detail line is the whole point.
 */
const VerbButton = ({
  icon,
  label,
  detail,
  destructive,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  detail: string;
  destructive?: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left transition-colors",
      destructive
        ? "text-destructive hover:bg-destructive/10"
        : "text-foreground hover:bg-muted",
    )}
  >
    <span className="mt-0.5 shrink-0">{icon}</span>
    <span className="min-w-0">
      <span className="block text-xs font-medium">{label}</span>
      <span className="block text-[10px] leading-relaxed text-muted-foreground">
        {detail}
      </span>
    </span>
  </button>
);

export default ProfileCards;
