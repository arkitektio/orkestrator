import { FaktsGuard } from "@jhnnsrs/fakts";
import React from "react";
import { Route, Routes } from "react-router";
import { PublicNavigationBar } from "../components/navigation/PublicNavigationBar";
import { PublicFakts } from "../pages/public/PublicFakts";
import { Callback } from "./pages/Callback";
import { Home } from "./pages/Home";
interface Props {}

export const PublicRouter: React.FC<Props> = (props) => {
  return (
    <FaktsGuard fallback={<PublicFakts />}>
      <div className="flex flex-col h-screen sm:flex-row-reverse">
        <div className="flex-grow flex bg-gradient-to-b from-back-900 via-back-900 via-back-850 via-back-850 to-back-800 overflow-y-auto">
          <Routes>
            <Route path="callback" element={<Callback />} />
            <Route index element={<Home />} />
          </Routes>
        </div>
        <div className="flex-initial sm:flex-initial sm:static sm:w-20">
          <PublicNavigationBar />
        </div>
      </div>
    </FaktsGuard>
  );
};

export default PublicRouter;
