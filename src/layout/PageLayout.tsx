import { Allotment } from "allotment";
import React, { useEffect, useRef, useState } from "react";
import {
  RiArrowLeftFill,
  RiArrowLeftSFill,
  RiArrowRightSFill,
} from "react-icons/ri";
import { MeDocument } from "../rekuest/api/graphql";
import BreadCrumbs from "../components/navigation/Breadcrumbs";
import { Actionbar } from "./Actionbar";

export interface PageLayoutProps {
  children: React.ReactNode;
  sidebar?: React.ReactNode;
  toggleButton?: React.ReactNode;
  actions?: React.ReactNode;
  width?: string;
}

export const PageLayout: React.FC<PageLayoutProps> = (props) => {
  const [isOpen, setIsOpen] = useState(
    localStorage.rightsidebarOpen === "true"
  );
  const [reload, setReload] = useState(true);

  useEffect(() => {
    if (reload) {
      console.log(reload);
    }
    setIsOpen(localStorage.rightsidebarOpen === "true");

    return;
  }, [reload]);

  const setOpen = (open: boolean) => {
    localStorage.setItem("rightsidebarOpen", open ? "true" : "false");
    setReload(!reload);
  };

  return (
    <div className="flex flex-grow h-full w-full page-layout">
      <Allotment onChange={(size) => {}}>
        <Allotment.Pane
          preferredSize={isOpen ? "70%" : "100%"}
          className="flex"
        >
          <div
            className={"relative flex-grow flex flex-col"}
            style={{ zIndex: 0 }}
          >
            <BreadCrumbs />
            {props.actions && <Actionbar>{props.actions}</Actionbar>}
            <div
              className="flex-grow p-2 sm:p-4 overflow-y-auto w-full @container"
              data-enableselect="true"
            >
              {props.children}
            </div>
            {props.sidebar && (
              <div
                className="absolute top-[1rem] right-0 text-xl text-white bg-primary-300 rounded-l-md px-1 cursor-pointer "
                onClick={() => setOpen(!isOpen)}
              >
                {!isOpen ? <RiArrowLeftSFill /> : <RiArrowRightSFill />}
              </div>
            )}
          </div>
        </Allotment.Pane>
        <Allotment.Pane
          preferredSize={isOpen ? "30%" : "0%"}
          visible={isOpen && props.sidebar != undefined}
        >
          <div
            className={`flex flex-col flex-grow dark:bg-slate-800 bg-gray-100 border-l-2 border-l-gray-700 shadow-element z-0 h-full`}
          >
            {props.sidebar}
          </div>
        </Allotment.Pane>
      </Allotment>
    </div>
  );
};
