import { LinkContextMenu } from "@/command/tabs/LinkContextMenu";
import { TabOutlet } from "@/command/tabs/TabOutlet";
import { PageCorner } from "./components/debug/PageCorner";
import { AppLayout } from "@/components/layout/AppLayout";
import { WelcomeLayout } from "@/components/layout/WelcomeLayout";

import { Arkitekt } from "./Arkitekt";
import { AppRoutes } from "./AppRoutes";
import { ConnectingFallback } from "./components/fallbacks/Connecting";
import { NotConnected } from "./components/fallbacks/NotConnected";
import { PrivateNavigationBar } from "./components/navigation/PrivateNavigationBar";

/**
 * Signed in, the app; signed out, the welcome screen — and nothing of the app
 * around it.
 *
 * The same guard every module route uses decides, so "signed in" means here
 * exactly what it means on a page: a stored session with a live self-service.
 * A profile SWITCH does not pass through here — the current connection stays
 * up while the next one is proven — so the rail does not blink on a switch.
 */
export const AppShell = () => (
  <Arkitekt.Guard
    notConnectedFallback={
      <WelcomeLayout>
        <NotConnected />
      </WelcomeLayout>
    }
    connectingFallback={
      <WelcomeLayout>
        <ConnectingFallback />
      </WelcomeLayout>
    }
  >
    <AppLayout navigationBar={<PrivateNavigationBar />}>
      {/* One copy of the routes per open tab, each with its own history. */}
      <TabOutlet routes={<AppRoutes />} />
      {/* Over the page's bottom-right corner: report a bug, and the debug badge. */}
      <PageCorner />
      {/* Right-click on any plain in-app link: open in a new tab, or to the side. */}
      <LinkContextMenu />
    </AppLayout>
  </Arkitekt.Guard>
);

export default AppShell;
