import React from "react";
import { AiOutlineTeam } from "react-icons/ai";
import { BiData, BiSync } from "react-icons/bi";
import { FiSettings } from "react-icons/fi";
import { GrDocker } from "react-icons/gr";
import { IconContext } from "react-icons/lib";
import { TbHistory, TbLayoutDashboard } from "react-icons/tb";
import { TiArrowUp, TiFlowSwitch } from "react-icons/ti";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { FlussGuard } from "../../fluss/guard";
import { ManGuard } from "../../lok/guard";
import { MikroGuard } from "../../mikro/MikroGuard";
import { MikroNextGuard } from "../../mikro_next/MikroNextGuard";
import { PortGuard } from "../../port/PortGuard";
import { ExperimentalFeature } from "../../providers/experimental/Experimental";
import { RekuestGuard } from "../../rekuest/RekuestGuard";
import { TauriGuard } from "../../tauri/guard";
import { Back } from "./Back";
import { Logo } from "./Logo";
import { UserIcon } from "./UserIcon";
import "./styles.css";
export type INavigationBarProps = {
  children?: React.ReactNode;
};

const NavigationBar: React.FC<INavigationBarProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="dark:text-white flex sm:flex-col h-full flex-row bg-slate-900 sm:pt-0 shadow-element overflow-hidden border-r-1 border-r-gray-800 ">
      <div className="flex flex-grow sm:flex-col flex-row gap-8 mt-2 items-center">
        <div className="hidden flex-initial  font-light text-xl md:block text-slate-400 dark:text-slate-500 border-b-gray-600 ">
          {window.__TAURI__ && location.pathname != "/" ? (
            <Back
              width={"3.6rem"}
              height={"3.6rem"}
              cubeColor={"rgb(var(--color-primary-400))"}
              aColor={"rgb(var(--color-back-200))"}
              strokeColor={"rgb(var(--color-back-200))"}
              onClick={() => navigate(-1)}
            />
          ) : (
            <>
              <NavLink to={"/"}>
                <Logo
                  width={"3.6rem"}
                  height={"3.6rem"}
                  cubeColor={"rgb(var(--color-primary-400))"}
                  aColor={"rgb(var(--color-back-200))"}
                  strokeColor={"rgb(var(--color-back-200))"}
                />
              </NavLink>
            </>
          )}
        </div>

        <IconContext.Provider
          value={{
            size: "2.3em",
            style: { stroke: "1px" },
          }}
        >
          <MikroGuard>
            <NavLink
              key={"Data"}
              to={"mikro"}
              className={({ isActive }) =>
                ` dark:hover:text-back-500 px-2 py-2 hidden md:block
                } ${isActive ? "dark:text-back-400" : "text-back-500"}`
              }
            >
              <BiData />
            </NavLink>
          </MikroGuard>
          {/* <MikroGuard>
            <NavLink
              key={"Mikro Live"}
              to={"mikro/lives"}
              className={({ isActive }) =>
                ` dark:hover:text-back-500 px-2 py-2 hidden md:block
                } ${isActive ? "dark:text-back-500" : "text-back-400"}`
              }
            >
              <MdLiveTv />
            </NavLink>
          </MikroGuard> */}
          <RekuestGuard>
            <NavLink
              key={"Dashboard"}
              to={"rekuest"}
              className={({ isActive }) =>
                ` dark:hover:text-back-400 px-2 py-2 hidden md:block
                } ${isActive ? "dark:text-back-400" : "text-back-500"}`
              }
            >
              <TbLayoutDashboard />
            </NavLink>
          </RekuestGuard>
          <RekuestGuard>
            <NavLink
              key={"History"}
              to={"rekuest/history"}
              className={({ isActive }) =>
                ` dark:hover:text-back-400 px-2 py-2 hidden md:block
                } ${isActive ? "dark:text-back-400" : "text-back-500"}`
              }
            >
              <TbHistory />
            </NavLink>
          </RekuestGuard>
          <MikroNextGuard>
            <NavLink
              key={"MikroNext"}
              to={"mikronext"}
              className={({ isActive }) =>
                ` dark:hover:text-back-400 px-2 py-2 hidden md:block
                } ${isActive ? "dark:text-back-400" : "text-back-500"}`
              }
            >
              <TiArrowUp />
            </NavLink>
          </MikroNextGuard>

          <FlussGuard>
            <NavLink
              key={"Flows"}
              to={"fluss"}
              className={({ isActive }) =>
                ` dark:hover:text-back-400 px-2 py-2 hidden md:block
                ${isActive ? "dark:text-back-400" : "text-back-500"}`
              }
            >
              <TiFlowSwitch />
            </NavLink>
          </FlussGuard>
          <PortGuard>
            <NavLink
              key={"Port"}
              to={"port"}
              className={({ isActive }) =>
                ` dark:hover:text-back-400 px-2 py-2 hidden md:block
                ${isActive ? "dark:text-back-400" : "text-back-500"}`
              }
            >
              <GrDocker />
            </NavLink>
          </PortGuard>
          <ManGuard>
            <NavLink
              key={"Teams"}
              to={"lok"}
              className={({ isActive }) =>
                ` dark:hover:text-back-400 px-2 py-2 hidden md:block
                ${isActive ? "dark:text-back-400" : "text-back-500"}`
              }
            >
              <AiOutlineTeam />
            </NavLink>
          </ManGuard>
          <NavLink
            to={"/user/settings"}
            className={({ isActive }) =>
              ` dark:hover:text-back-400 px-2 py-2 
              ${isActive ? "dark:text-back-400" : "text-back-500"}`
            }
          >
            <FiSettings size={"2.6em"} style={{ stroke: "1px" }} />
          </NavLink>
        </IconContext.Provider>
      </div>
      <div className="flex flex-initial sm:flex-col flex-row gap-1 items-center pb-2">
        <ExperimentalFeature>
          <TauriGuard>
            <IconContext.Provider
              value={{
                size: "2.6em",
                style: { stroke: "1px" },
              }}
            >
              <NavLink
                key={"Tauri"}
                to={"local"}
                className={({ isActive }) =>
                  ` dark:hover:text-back-500 px-2 py-2 hidden md:block
                } ${isActive ? "dark:text-back-500" : "text-back-400"}`
                }
              >
                <BiSync />
              </NavLink>
            </IconContext.Provider>
          </TauriGuard>
        </ExperimentalFeature>
        <UserIcon />
      </div>
    </div>
  );
};

export { NavigationBar };
