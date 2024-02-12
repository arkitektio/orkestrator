import { FaktsGuard } from "@jhnnsrs/fakts";
import { HerreGuard } from "@jhnnsrs/herre";
import React from "react";
import { Route, Routes } from "react-router";
import { NavigationBar } from "../components/navigation/NavigationBar";
import FlussModule from "../fluss/FlussModule";
import KlusterModule from "../kluster/KlusterModule";
import { LokGuard } from "../lok/LokGuard";
import LokModule from "../lok/LokModule";
import MikroModule from "../mikro/MikroModule";
import MikroNextModule from "../mikro_next/MikroNextModule";
import OmeroArkModule from "../omero-ark/OmeroArkModule";
import { NoRoute } from "../pages/fallbacks/NoRoute";
import { PublicFakts } from "../pages/public/PublicFakts";
import { PublicLogin } from "../pages/public/PublicLogin";
import PortModule from "../port/PortModule";
import RekuestModule from "../rekuest/RekuestModule";
import SettingsModule from "../settings/SettingsModule";
import TauriModule from "../tauri/TauriModule";
import { Home } from "./pages/Home";

interface Props {}

export const ProtectedRouter: React.FC<Props> = (props) => {
  return (
    <div className="flex flex-col h-screen sm:flex-row-reverse">
      <div className="flex-grow flex bg-gradient-to-b from-back-900 via-back-900 via-back-850 via-back-850 to-back-800 overflow-y-auto">
        <FaktsGuard fallback={<PublicFakts />}>
          <HerreGuard fallback={<PublicLogin />}>
            <LokGuard fallback={<PublicFakts/>}>
              <React.Suspense fallback={<>Loading slowly....</>}>
                <Routes>
                  <Route index element={<Home />} />

                  {/* Mikro Next*/}
                  <Route path="mikronext/*" element={<MikroNextModule />} />

                  {/* Mikro*/}
                  <Route path="mikro/*" element={<MikroModule />} />

                  {/* lok */}
                  <Route path="lok/*" element={<LokModule />}></Route>

                  {/* Fluss */}

                  <Route path="fluss/*" element={<FlussModule />}></Route>

                  {/* Rekuest */}
                  <Route path="rekuest/*" element={<RekuestModule />}></Route>

                  {/* Rekuest */}
                  <Route path="omero-ark/*" element={<OmeroArkModule />}></Route>
                  <Route path="kluster/*" element={<KlusterModule />}></Route>

                  {/* port */}
                  <Route path="port/*" element={<PortModule />}></Route>

                  {/* Settings */}
                  <Route path="settings/*" element={<SettingsModule />} />

                  {/* Tauri */}
                  <Route path="tauri" element={<TauriModule />} />

                  <Route path="*" element={<NoRoute />} />
                </Routes>
              </React.Suspense>
            </LokGuard>
          </HerreGuard>
        </FaktsGuard>
      </div>
      <div className="flex-initial sm:flex-initial sm:static sm:w-20">
        <NavigationBar />
      </div>
    </div>
  );
};

export default ProtectedRouter;
