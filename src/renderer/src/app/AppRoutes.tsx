import { Route, Routes } from "react-router-dom";
import { BackNavigationErrorCatcher } from "./AppProvider";
import { HomePage } from "./pages/HomePage";
import { NewTabPage } from "./pages/NewTabPage";
import { ShareGatePage } from "./pages/ShareGatePage";
import { AuthCallbackPage } from "../core/authflow/AuthCallbackPage";
import { RelayCallbackRedirect } from "../core/authflow/RelayCallbackRedirect";
import { SmartLinkPage } from "../core/links/SmartLinkPage";
import { IntentPage } from "../core/links/IntentPage";
import { ModuleRoute } from "../core/modules/ModuleRoute";
import { NotFound } from "../core/layout/fallbacks/NotFound";
import { MODULE_ALIASES, ModuleRedirect } from "./components/navigation/ModuleRedirect";
import { useModuleHostVersion } from "@/core/modules/host/host";
import { modulePages } from "../core/modules/registries";
import { preloadable } from "@/core/util/preloadable";

// Each module root is its own chunk, loaded before the window's first render
// (`preloadAll` in main.tsx): in a built app a chunk is on local disk, and
// loading it on first visit only flashed the loading fallback. Modules come
// from their builtins (`page`); only the host's own routes are named here.
const BlokModule = preloadable(() => import("@/core/blok/BlokModule"));
const SettingsModule = preloadable(() => import("@/app/settings/SettingsModule"));

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
          {/* Home: what needs you, where you were, what the modules have for you. */}
          <Route index element={<HomePage />} />
          {/* What ⌘T opens: the search as a page, plus the modules. */}
          <Route path="new" element={<NewTabPage />} />
          {/* Where a scoped share link lands before it becomes a page. Not
              protected: deciding where a link belongs must work while we are on
              the wrong connection, or none. */}
          <Route path="open" element={<ShareGatePage />} />
          {/* Where a login at an external provider comes back, for every
              module. Not protected either: it says why a login cannot be
              finished here instead of rendering nothing. */}
          <Route path="auth/callback/:namespace" element={<AuthCallbackPage />} />
          {/* The form the relay opens (orkestrator://<service>/auth/callback). */}
          <Route path=":namespace/auth/callback" element={<RelayCallbackRedirect />} />
          {/* A smartlink (orkestrator://smart/<org>/<hub>/<identifier>/<id>):
              decides which login it belongs to before it becomes a page. */}
          <Route path="smart/*" element={<SmartLinkPage />} />
          {/* An intent link (orkestrator://do/v1/repo.install?…): a stable,
              versioned verb for published links (README badges), mapped onto
              whichever module answers it. Unguarded for the same reason. */}
          <Route path="do/*" element={<IntentPage />} />
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
