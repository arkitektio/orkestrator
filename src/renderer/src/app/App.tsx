import { Arkitekt } from "@/app/Arkitekt";
import { AppLayout } from "@/components/layout/AppLayout";
import React from "react";
import { Route, Routes } from "react-router-dom";
import { AppProvider, BackNavigationErrorCatcher } from "./AppProvider";
import { ConnectingFallback } from "./components/fallbacks/Connecting";
import { NotConnected } from "./components/fallbacks/NotConnected";
import { NotFound } from "./components/fallbacks/NotFound";
import {PrivateNavigationBar} from "./components/navigation/PrivateNavigationBar";

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
const LokNextModule = React.lazy(() => import("@/lok-next/LokNextModule"));
const LovekitModule = React.lazy(() => import("@/lovekit/LovekitModule"));
const MikroNextModule = React.lazy(() => import("@/mikro-next/MikroNextModule"));
const OmeroArkModule = React.lazy(() => import("@/omero-ark/OmeroArkModule"));
const ReaktionModule = React.lazy(() => import("@/reaktion/ReaktionModule"));
const RekuestNextModule = React.lazy(() => import("@/rekuest/RekuestNextModule"));
const SettingsModule = React.lazy(() => import("@/settings/SettingsModule"));

// Entrypoint of the application.
// We provide two main routers, one for the public routes, and one for the private routes.
const protectModule = (component: React.ReactNode, fallback?: React.ReactNode) => {
  return (
    <Arkitekt.Guard
      notConnectedFallback={fallback || <NotConnected />}
      connectingFallback={<ConnectingFallback />}
    >
      <React.Suspense fallback={<ConnectingFallback />}>{component}</React.Suspense>
    </Arkitekt.Guard>
  );
};

function App() {
  return (
    <AppProvider>
      <AppLayout navigationBar={<PrivateNavigationBar />}>
        <BackNavigationErrorCatcher>
          <Routes>
            <Route
              index
              element={
                <React.Suspense fallback={<ConnectingFallback />}>
                  <Hero />
                </React.Suspense>
              }
            />
            <Route path="mikro/*" element={protectModule(<MikroNextModule />)} />
            <Route path="elektro/*" element={protectModule(<ElektroModule />)} />
            <Route path="rekuest/*" element={protectModule(<RekuestNextModule />)} />
            <Route path="fluss/*" element={protectModule(<ReaktionModule />)} />
            <Route path="kabinet/*" element={protectModule(<KabinetModule />)} />
            <Route path="omero_ark/*" element={protectModule(<OmeroArkModule />)} />
            <Route path="kraph/*" element={protectModule(<KraphModule />)} />
            <Route path="lok/*" element={protectModule(<LokNextModule />)} />
            <Route path="settings/*" element={protectModule(<SettingsModule />)} />
            <Route path="blok/*" element={protectModule(<BlokModule />)} />
            <Route path="alpaka/*" element={protectModule(<AlpakaModule />)} />
            <Route path="lovekit/*" element={protectModule(<LovekitModule />)} />
            <Route path="dokuments/*" element={protectModule(<DokumentsModule />)} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BackNavigationErrorCatcher>
      </AppLayout>
    </AppProvider>
  );
}

export default App;
