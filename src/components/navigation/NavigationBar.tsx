import React, { useEffect } from "react";
import { useDrop } from "react-dnd";
import { AiOutlineTeam } from "react-icons/ai";
import { BiData, BiSync } from "react-icons/bi";
import { FiSettings } from "react-icons/fi";
import { GrDocker } from "react-icons/gr";
import { IconContext } from "react-icons/lib";
import { TbHistory, TbLayoutDashboard } from "react-icons/tb";
import { TiArrowUp, TiFlowSwitch } from "react-icons/ti";
import {
  NavLink,
  NavLinkProps,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { SMART_MODEL_DROP_TYPE } from "../../constants";
import { FlussGuard } from "../../fluss/guard";
import { LokGuard } from "../../lok/LokGuard";
import { MikroGuard } from "../../mikro/MikroGuard";
import { MikroNextGuard } from "../../mikro_next/MikroNextGuard";
import { PortGuard } from "../../port/PortGuard";
import { RekuestGuard } from "../../rekuest/RekuestGuard";
import { ExperimentalFeature } from "../../settings/Experimental";
import { TauriGuard } from "../../tauri/guard";
import { Back } from "./Back";
import { Logo } from "./Logo";
import { UserIcon } from "./UserIcon";
import "./styles.css";
export type INavigationBarProps = {
  children?: React.ReactNode;
};

export const DroppableNavLink = (props: NavLinkProps) => {
  const navigate = useNavigate();

  const [{ isOver, canDrop, overItems }, drop] = useDrop(() => {
    return {
      accept: [SMART_MODEL_DROP_TYPE],
      drop: (item, monitor) => {
        if (!monitor.didDrop()) {
          console.log("Ommitting Parent Drop");
        }
        return {};
      },
      collect: (monitor) => {
        return {
          isOver: !!monitor.isOver(),
        };
      },
    };
  }, []);

  useEffect(() => {
    if (isOver) {
      const timeout = setTimeout(() => {
        console.log("Navigating to ", props.to);
        navigate(props.to);
      }, 1000);

      return () => {
        clearTimeout(timeout);
      };
    }
  }, [isOver]);

  return (
    <div className={`${isOver && "animate-pulse"}`}>
      <NavLink {...props} ref={drop} />
    </div>
  );
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
            <DroppableNavLink
              key={"Data"}
              to={"mikro"}
              className={({ isActive }) =>
                ` dark:hover:text-back-500 px-2 py-2 hidden md:block
                } ${isActive ? "dark:text-back-400" : "text-back-500"}`
              }
            >
              <BiData />
            </DroppableNavLink>
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
            <DroppableNavLink
              key={"Dashboard"}
              to={"rekuest"}
              className={({ isActive }) =>
                ` dark:hover:text-back-400 px-2 py-2 hidden md:block
                } ${isActive ? "dark:text-back-400" : "text-back-500"}`
              }
            >
              <TbLayoutDashboard />
            </DroppableNavLink>
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
            <DroppableNavLink
              key={"MikroNext"}
              to={"mikronext"}
              className={({ isActive }) =>
                ` dark:hover:text-back-400 px-2 py-2 hidden md:block
                } ${isActive ? "dark:text-back-400" : "text-back-500"}`
              }
            >
              <TiArrowUp />
            </DroppableNavLink>
          </MikroNextGuard>

          <FlussGuard>
            <DroppableNavLink
              key={"Flows"}
              to={"fluss"}
              className={({ isActive }) =>
                ` dark:hover:text-back-400 px-2 py-2 hidden md:block
                ${isActive ? "dark:text-back-400" : "text-back-500"}`
              }
            >
              <TiFlowSwitch />
            </DroppableNavLink>
          </FlussGuard>
          <PortGuard>
            <DroppableNavLink
              key={"Port"}
              to={"port"}
              className={({ isActive }) =>
                ` dark:hover:text-back-400 px-2 py-2 hidden md:block
                ${isActive ? "dark:text-back-400" : "text-back-500"}`
              }
            >
              <GrDocker />
            </DroppableNavLink>
          </PortGuard>
          <LokGuard>
            <DroppableNavLink
              key={"Teams"}
              to={"lok"}
              className={({ isActive }) =>
                ` dark:hover:text-back-400 px-2 py-2 hidden md:block
                ${isActive ? "dark:text-back-400" : "text-back-500"}`
              }
            >
              <AiOutlineTeam />
            </DroppableNavLink>
          </LokGuard>
          <DroppableNavLink
            to={"/user/settings"}
            className={({ isActive }) =>
              ` dark:hover:text-back-400 px-2 py-2 
              ${isActive ? "dark:text-back-400" : "text-back-500"}`
            }
          >
            <FiSettings size={"2.6em"} style={{ stroke: "1px" }} />
          </DroppableNavLink>
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
        <LokGuard>
          <UserIcon />
        </LokGuard>
      </div>
    </div>
  );
};

export { NavigationBar };
