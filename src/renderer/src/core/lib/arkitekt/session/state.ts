/**
 * What the session is doing right now — one value, not three flags.
 *
 * It used to be `connecting`, `hasBootstrapped` and `switchingProfileId`,
 * written together (or not) at a dozen sites, with `ConnectedGuard` ordering
 * its checks by hand to make sense of combinations like "connecting but not
 * bootstrapped". Only one of these can be true at a time, so it is one field.
 *
 * Deliberately separate from the live connection and from the last error: a
 * switch or a grant runs WHILE the current profile stays usable, and a failed
 * one leaves it up with an error to show.
 */
export type SessionActivity =
  /** Launch: the stored profile is being brought up. */
  | { kind: "booting" }
  /** A browser grant is in progress. */
  | { kind: "granting" }
  /** A stored profile's credential is being proved before the swap. */
  | { kind: "switching"; profileId: string }
  /** Nothing in progress. */
  | { kind: "settled" };

export const BOOTING: SessionActivity = { kind: "booting" };
export const GRANTING: SessionActivity = { kind: "granting" };
export const SETTLED: SessionActivity = { kind: "settled" };

export const switching = (profileId: string): SessionActivity => ({ kind: "switching", profileId });

/** The launch has run its course, successfully or not. */
export const hasBootstrapped = (activity: SessionActivity): boolean => activity.kind !== "booting";

export const isGranting = (activity: SessionActivity): boolean => activity.kind === "granting";

export const switchingProfileId = (activity: SessionActivity): string | null =>
  activity.kind === "switching" ? activity.profileId : null;
