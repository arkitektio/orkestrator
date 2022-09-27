import { Outlet } from "react-router";
import { PublicNavigationBar } from "./components/navigation/PublicNavigationBar";

export const PublicApp: React.FC = () => {
  return (
    <div className="flex flex-col h-screen sm:flex-row-reverse">
      <div className="flex-grow flex bg-slate-900 overflow-y-auto">
        <Outlet />
      </div>
      <div className="flex-initial sm:flex-initial sm:static sm:w-20">
        <PublicNavigationBar />
      </div>
    </div>
  );
};
