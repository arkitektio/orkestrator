import { Arkitekt } from "@/app/Arkitekt";
import React from "react";
import { Route, Routes } from "react-router-dom";
import { BackNavigationErrorCatcher } from "./AppProvider";
import { NewTabPage } from "./pages/NewTabPage";
import { ShareGatePage } from "./pages/ShareGatePage";
import { ConnectingFallback } from "./components/fallbacks/Connecting";
import { ModuleLoadingFallback } from "./components/fallbacks/ModuleLoading";
import { QuietPage } from "./components/fallbacks/QuietPage";
import { ShellSignInNotice } from "./components/shell/ShellSignInNotice";
import { NotFound } from "./components/fallbacks/NotFound";
import { MODULE_ALIASES, ModuleRedirect } from "./components/navigation/ModuleRedirect";

// The dashboard carries dockview; it is the index route, but a deep link into a
// module should not pay for it.
const Hero = React.lazy(() => import("@/app/pages/Hero"));

// Each module root is its own chunk: the scene renderer (three.js), DuckDB,
// Monaco and the flow editor only load when their route is first visited
// instead of being parsed before the first paint for every user.
const AlpakaModule = React.lazy(() => import("@/alpaka/AlpakaModule"));
const BlokModule = React.lazy(() => import("@/blok/BlokModule"));
const DokumentsModule = React.lazy(() => import("@/dokuments/DokumentsModule"));
const ElektroModule = React.lazy(() => import("@/elektro/ElektroModule"));
const KabinetModule = React.lazy(() => import("@/kabinet/KabinetModule"));
const KraphModule = React.lazy(() => import("@/kraph/KraphModule"));
const LokNextModule = React.lazy(() => import("@/lok/LokNextModule"));
const LovekitModule = React.lazy(() => import("@/lovekit/LovekitModule"));
const MikroNextModule = React.lazy(() => import("@/mikro/MikroNextModule"));
const OmeroArkModule = React.lazy(() => import("@/omeroark/OmeroArkModule"));
const ReaktionModule = React.lazy(() => import("@/fluss/ReaktionModule"));
const RekuestNextModule = React.lazy(() => import("@/rekuest/RekuestNextModule"));
const SettingsModule = React.lazy(() => import("@/settings/SettingsModule"));

// Entrypoint of the application.
// We provide two main routers, one for the public routes, and one for the private routes.
const protectModule = (component: React.ReactNode, fallback?: React.ReactNode) => {
  return (
    <Arkitekt.Guard
      // Inside the shell these can only fire on a LATER loss of session — the
      // launch never reaches a route — and `AppShell` already owns both of
      // those surfaces. A full welcome screen in the content card would be the
      // boot flicker again, one level down.
      notConnectedFallback={fallback || <ShellSignInNotice />}
      bootingFallback={<QuietPage />}
      connectingFallback={<ConnectingFallback />}
    >
      {/* The chunk is loading, not the session: the guard above already passed. */}
      <React.Suspense fallback={<ModuleLoadingFallback />}>{component}</React.Suspense>
    </Arkitekt.Guard>
  );
};

/**
 * The app's routes, as one component.
 *
 * Lifted verbatim out of `App.tsx` — lazy modules, `protectModule` and all —
 * so that `TabOutlet` can render a copy per open tab, each under that tab's
 * own memory router. Nothing here knows tabs exist: a page mounted in a
 * background tab is the same page it always was.
 */
export const AppRoutes = () => (
  <>
    <BackNavigationErrorCatcher>
      <Routes>
        <Route
          index
          element={
            <React.Suspense fallback={<ModuleLoadingFallback />}>
              <Hero />
            </React.Suspense>
          }
        />
        {/* What ⌘T opens: the search as a page, plus the modules. */}
        <Route path="new" element={<NewTabPage />} />
        {/* Where a scoped share link lands before it becomes a page. Not
            protected: deciding where a link belongs must work while we are on
            the wrong connection, or none. */}
        <Route path="open" element={<ShareGatePage />} />
        <Route path="mikro/*" element={protectModule(<MikroNextModule />)} />
        <Route path="elektro/*" element={protectModule(<ElektroModule />)} />
        <Route path="rekuest/*" element={protectModule(<RekuestNextModule />)} />
        <Route path="fluss/*" element={protectModule(<ReaktionModule />)} />
        <Route path="kabinet/*" element={protectModule(<KabinetModule />)} />
        <Route path="omeroark/*" element={protectModule(<OmeroArkModule />)} />
        <Route path="kraph/*" element={protectModule(<KraphModule />)} />
        {/* Lok is labelled "Team" in the rail, but routes by namespace. */}
        <Route path="lok/*" element={protectModule(<LokNextModule />)} />
        <Route path="settings/*" element={protectModule(<SettingsModule />)} />
        <Route path="blok/*" element={protectModule(<BlokModule />)} />
        <Route path="alpaka/*" element={protectModule(<AlpakaModule />)} />
        <Route path="lovekit/*" element={protectModule(<LovekitModule />)} />
        <Route path="dokuments/*" element={protectModule(<DokumentsModule />)} />
        {Object.entries(MODULE_ALIASES).map(([from, to]) => (
          <Route key={from} path={`${from}/*`} element={<ModuleRedirect from={from} to={to} />} />
        ))}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BackNavigationErrorCatcher>
  </>
);

export default AppRoutes;
