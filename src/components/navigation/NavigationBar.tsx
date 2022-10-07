import React from "react";
import { AiOutlineTeam } from "react-icons/ai";
import { BiData } from "react-icons/bi";
import { FiSettings } from "react-icons/fi";
import { IconContext } from "react-icons/lib";
import { TbLayoutDashboard } from "react-icons/tb";
import { TiFlowSwitch } from "react-icons/ti";
import { NavLink } from "react-router-dom";
import { Logo } from "./Logo";
import "./styles.css";
import { UserIcon } from "./UserIcon";
export type INavigationBarProps = {
  children?: React.ReactNode;
};

const navigation: {
  name: string;
  href: string;
  sm: boolean;
  icon?: React.ReactNode;
}[] = [
  { name: "Data", href: "mikro", sm: true, icon: <BiData /> },
  {
    name: "Dashboard",
    href: "rekuest",
    sm: true,
    icon: <TbLayoutDashboard />,
  },
  { name: "Flows", href: "fluss", sm: true, icon: <TiFlowSwitch /> },
  // { name: "Whales", href: "kuay", sm: false, icon: <GiWhaleTail /> },
  // { name: "Search", href: "search", sm: true, icon: <AiOutlineSearch /> },
  { name: "Teams", href: "man", sm: false, icon: <AiOutlineTeam /> },
];

const NavigationBar: React.FC<INavigationBarProps> = ({ children }) => {
  return (
    <div className="dark:text-white flex sm:flex-col h-full flex-row bg-slate-900 sm:pt-0 shadow-element overflow-hidden  ">
      <div className="flex flex-grow sm:flex-col flex-row gap-8 mt-2 items-center">
        <div className="hidden flex-initial  font-light text-xl md:block text-slate-400 dark:text-slate-500 border-b-gray-600 ">
          <NavLink to={"/"} className="rounded-md text-xl font-light">
            <Logo
              width={"4rem"}
              height={"4rem"}
              cubeColor={"rgb(var(--color-primary-400))"}
              aColor={"var(--color-back-700)"}
              strokeColor={"var(--color-back-700)"}
            />
          </NavLink>
        </div>
        <IconContext.Provider
          value={{
            size: "2.6em",
            style: { stroke: "1px" },
          }}
        >
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              className={({ isActive }) =>
                ` dark:hover:text-back-500 px-2 py-2 ${
                  !item.sm && "hidden md:block"
                } ${isActive ? "dark:text-back-500" : "text-back-400"}`
              }
            >
              {item.icon}
            </NavLink>
          ))}

          <NavLink
            to={"/user/settings"}
            className={({ isActive }) =>
              ` dark:hover:text-back-500 px-2 py-2 
            ${isActive ? " dark:text-back-500" : " text-back-400"}`
            }
          >
            <FiSettings size={"2.6em"} style={{ stroke: "1px" }} />
          </NavLink>
        </IconContext.Provider>
      </div>
      <div className="flex flex-initial sm:flex-col flex-row gap-8 items-center">
        <UserIcon />
      </div>
    </div>
  );
};

export { NavigationBar };
