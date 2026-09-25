const PENDING_SHARE_KEY = "arkitektPendingShare";

/**
 * A path to land on once a deliberate profile switch has finished.
 *
 * A switch re-boots the tab store with boot path `null` (see `TabsProvider`),
 * which is right for an ordinary switch: the hash at that moment still mirrors
 * the PREVIOUS membership's tab, and reading it as intent would open the old
 * organization's page inside the new one. But it also destroys the `/open` tab
 * that asked for the switch, so a shared link would switch and then land
 * nowhere.
 *
 * The difference is provenance. A stale hash is a leftover; this is intent the
 * user just confirmed, recorded immediately before the switch and consumed once
 * on the other side. `sessionStorage` because it must not outlive the window:
 * a link confirmed today should not reopen on next week's launch.
 */
export const rememberPendingShare = (path: string): void => {
  try {
    window.sessionStorage.setItem(PENDING_SHARE_KEY, path);
  } catch {
    // A private window with storage blocked still switches; it just lands on
    // the new membership's own tabs instead of the shared page.
  }
};

/**
 * Take the pending path, if there is one, and forget it.
 *
 * Consuming is the point: it must apply to exactly the switch it was recorded
 * for, never to the next one.
 */
export const consumePendingShare = (): string | null => {
  try {
    const path = window.sessionStorage.getItem(PENDING_SHARE_KEY);
    if (path) window.sessionStorage.removeItem(PENDING_SHARE_KEY);
    return path;
  } catch {
    return null;
  }
};
