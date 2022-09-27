import React from "react";
import { AiOutlineUser } from "react-icons/ai";
import { BiData } from "react-icons/bi";
import { NavLink } from "react-router-dom";
import { Logo } from "./Logo";
import "./styles.css";
export type INavigationBarProps = {
  children?: React.ReactNode;
};

const navigation: {
  name: string;
  href: string;
  sm: boolean;
  icon?: React.ReactNode;
}[] = [{ name: "User", href: "data", sm: true, icon: <BiData /> }];

const PublicNavigationBar: React.FC<INavigationBarProps> = ({ children }) => {
  return (
    <div className="dark:text-white flex sm:flex-col h-full flex-row bg-slate-900 sm:pt-0 shadow-element overflow-hidden ">
      <div className="flex flex-grow sm:flex-col flex-row gap-8 mt-2 items-center">
        <div className="hidden flex-initial  font-light text-xl md:block text-slate-400 dark:text-slate-500 border-b-gray-600 ">
          <NavLink to={"/"} className="rounded-md text-xl font-light">
            <Logo
              width={"4rem"}
              cubeColor={"rgb(var(--color-primary-300))"}
              aColor={"var(--color-back-700)"}
              strokeColor={"var(--color-back-700)"}
            />
          </NavLink>
        </div>
      </div>
      <div className="flex flex-grow sm:flex-col flex-row gap-8  md:mt-3 md:ml-1"></div>
      <div className="flex flex-initial sm:flex-col flex-row gap-8 items-center">
        <NavLink
          to={"/user"}
          className={({ isActive }) =>
            "dark:text-gray-800 flex text-sm rounded-md px-2 py-2  mr-1 relative"
          }
        >
          <AiOutlineUser size={"2.6em"} style={{ stroke: "1px" }} />
        </NavLink>
      </div>
    </div>
  );
};

export { PublicNavigationBar };
