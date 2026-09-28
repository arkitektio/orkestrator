import { LinkContextMenu } from "@/core/tabs/LinkContextMenu";
import { TabOutlet } from "@/core/tabs/TabOutlet";
import { PageCorner } from "../core/debug/ui/PageCorner";
import { AppLayout } from "@/app/layout/AppLayout";
import { WelcomeLayout } from "@/app/layout/WelcomeLayout";

import { Arkitekt } from "./Arkitekt";
import { AppRoutes } from "./AppRoutes";
import { NotConnected } from "./components/fallbacks/NotConnected";
import { QuietPage } from "../core/layout/fallbacks/QuietPage";
import { PrivateNavigationBar } from "./components/navigation/PrivateNavigationBar";
import { ShellSignInNotice } from "../core/connection/ui/ShellSignInNotice";

/**
 * Which chrome the window wears, and what is inside it.
 *
 * The PROFILE BOOK decides the chrome, not the connection. A stored active
 * profile means this window belongs to that account — so it opens straight into
 * the app: rail, tabs, and the account already named in the footer, painted from
 * the cached labels before any token has been proven (the book is seeded
 * synchronously, see `seedProfileBook`). Auto-login then lands inside that
 * shell instead of replacing a welcome screen with it, which is what used to
 * make every launch flicker through two layouts.
 *
 * The CONNECTION decides only the page: quiet until the session is live, then
 * the route paints into an already-mounted tree — `AppLayout`, the rail and
 * `ProfileScope` are outside the guard precisely so none of them remount when
 * it lands. The rail fills in on its own as each service reports ready.
 *
 * A profile SWITCH does not pass through here either: the current connection
 * stays up while the next one is proven.
 */
export const AppShell = () => {
  const hasProfile = Arkitekt.useHasActiveProfile();

  // No account on this computer (or the last one was signed out / removed):
  // the welcome screen is the whole window, with no app chrome around it.
  if (!hasProfile) {
    return (
      <WelcomeLayout>
        <NotConnected />
      </WelcomeLayout>
    );
  }

  return (
    <AppLayout navigationBar={<PrivateNavigationBar />}>
      {/* Auto-login failed: says so over the empty page, offers the way back
          in, and renders nothing at all the rest of the time. */}
      <ShellSignInNotice />

      <Arkitekt.Guard
        bootingFallback={<QuietPage />}
        connectingFallback={<QuietPage />}
        // Inside the shell, "not connected" means the auto-login failed — the
        // notice above already says so, and dropping the welcome screen into
        // the content card would be the flicker again, one level down.
        notConnectedFallback={<QuietPage />}
      >
        {/* One copy of the routes per open tab, each with its own history. */}
        <TabOutlet routes={<AppRoutes />} />
        {/* Over the page's bottom-right corner: report a bug, and the debug badge. */}
        <PageCorner />
        {/* Right-click on any plain in-app link: open in a new tab, or to the side. */}
        <LinkContextMenu />
      </Arkitekt.Guard>
    </AppLayout>
  );
};

export default AppShell;
