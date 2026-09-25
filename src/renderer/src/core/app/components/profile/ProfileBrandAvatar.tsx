import { cn } from "@/core/lib/utils";
import type { StoredProfile } from "@/core/lib/arkitekt/fakts/profileStorageSchema";

/**
 * A profile's mark, painted from numbers alone.
 *
 * Deliberately not an `<img>`: avatar URLs are media keys that resolve against
 * the ACTIVE connection's datalayer endpoint (see `useResolve`), so a URL cached
 * for a parked profile is not resolvable while a different profile is live — and
 * the server's `presignedUrl` fields are deprecated besides. The organization's
 * brand hue and chroma are plain numbers, cached with the label, and render
 * correctly offline, which is exactly what a switcher listing parked logins
 * needs.
 */

/** Two letters, preferring the organization over the deployment. */
export const profileInitials = (profile: StoredProfile): string => {
  const source =
    profile.label.organizationName ||
    profile.label.organizationSlug ||
    profile.label.deploymentName ||
    profile.label.username ||
    "?";

  const words = source.trim().split(/[\s\-_.]+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
};

export const ProfileBrandAvatar = ({
  profile,
  className,
}: {
  profile: StoredProfile;
  className?: string;
}) => {
  const hue = profile.label.brandHue;
  const chroma = profile.label.brandChroma;

  // An organization that has set no brand falls through to the app's own
  // muted surface rather than to an arbitrary colour.
  const hasBrand = typeof hue === "number" && typeof chroma === "number";

  return (
    <div
      className={cn(
        "flex h-7 w-7 shrink-0 items-center justify-center rounded-md border text-[10px] font-semibold",
        hasBrand ? "text-white border-transparent" : "bg-muted text-muted-foreground",
        className,
      )}
      style={
        hasBrand
          ? { backgroundColor: `oklch(0.55 ${Math.min(chroma!, 0.37)} ${hue})` }
          : undefined
      }
      aria-hidden
    >
      {profileInitials(profile)}
    </div>
  );
};
