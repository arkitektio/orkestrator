import React from "react";
import { Route, Routes } from "react-router-dom";
import { BackNavigationErrorCatcher } from "./AppProvider";
import { NewTabPage } from "./pages/NewTabPage";
import { ShareGatePage } from "./pages/ShareGatePage";
import { ModuleLoadingFallback } from "../core/layout/fallbacks/ModuleLoading";
import { ModuleRoute } from "../core/modules/ModuleRoute";
import { NotFound } from "../core/layout/fallbacks/NotFound";
import { MODULE_ALIASES, ModuleRedirect } from "./components/navigation/ModuleRedirect";
import { useModuleHostVersion } from "@/core/modules/host/host";
import { modulePages } from "../core/modules/registries";

// The dashboard carries dockview; it is the index route, but a deep link into a
// module should not pay for it.
const Hero = React.lazy(() => import("@/app/pages/Hero"));

// Each module root is its own chunk: the scene renderer (three.js), DuckDB,
// Monaco and the flow editor only load when their route is first visited
// instead of being parsed before the first paint for every user.
// Modules come from their builtins (`page`), one lazy chunk each; only the
// host's own routes are named here.
const BlokModule = React.lazy(() => import("@/core/blok/BlokModule"));
const SettingsModule = React.lazy(() => import("@/app/settings/SettingsModule"));

/**
 * The app's routes, as one component.
 *
 * One component, so that `TabOutlet` can render a copy per open tab, each
 * under that tab's own memory router. Nothing here knows tabs exist: a page
 * mounted in a background tab is the same page it always was.
 *
 * No session guard: `AppShell` does not render routes without a session.
 * What stands between a route and its module is `ModuleRoute` (chunk, role,
 * service), the same for every module.
 */
export const AppRoutes = () => {
  // A module arriving (or leaving) adds (or drops) its routes.
  useModuleHostVersion();
  return (
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
          {/* Every module under its namespace (lok too: labelled "Team", routed as lok). */}
          {/* A module with `roles` shows "not permitted" to anyone else; one
              whose service is down, why. */}
          {modulePages().map(({ namespace, roles, serviceKey, Page }) => (
            <Route
              key={namespace}
              path={`${namespace}/*`}
              element={
                <ModuleRoute roles={roles} serviceKey={serviceKey}>
                  <Page />
                </ModuleRoute>
              }
            />
          ))}
          <Route
            path="settings/*"
            element={
              <ModuleRoute>
                <SettingsModule />
              </ModuleRoute>
            }
          />
          {/* Bloks run on rekuest. */}
          <Route
            path="blok/*"
            element={
              <ModuleRoute serviceKey="rekuest">
                <BlokModule />
              </ModuleRoute>
            }
          />
          {Object.entries(MODULE_ALIASES).map(([from, to]) => (
            <Route key={from} path={`${from}/*`} element={<ModuleRedirect from={from} to={to} />} />
          ))}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BackNavigationErrorCatcher>
    </>
  );
};

export default AppRoutes;
