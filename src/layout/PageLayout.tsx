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

export type Sidebar = {
  label: string;
  key: string;
  content: React.ReactNode;
};

export interface PageLayoutProps {
  children: React.ReactNode;
  sidebars?: Sidebar[];
  toggleButton?: React.ReactNode;
  actions?: React.ReactNode;
  width?: string;
}

export const PageLayout: React.FC<PageLayoutProps> = (props) => {
  const [isOpen, setIsOpen] = useState(
    props.sidebars?.map(
      (s) => localStorage[`${s.key}rightsidebar`] === "true"
    ) || []
  );
  const [reload, setReload] = useState(true);

  useEffect(() => {
    if (reload) {
      console.log(reload);
    }

    setIsOpen(
      props.sidebars?.map(
        (s) => localStorage[`${s.key}leftsidebar`] === "true"
      ) || []
    );

    return;
  }, [reload]);

  const setOpen = (key: string, open: boolean) => {
    localStorage.setItem(`${key}leftsidebar`, open ? "true" : "false");
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
              className="flex-grow p-2 sm:p-4 overflow-y-auto w-full @container flex flex-col"
              data-enableselect="true"
            >
              {props.children}
            </div>
            <div className="absolute top-[1rem] right-0 flex flex-col gap-2">
              {props.sidebars?.map((s, index) => (
                <div
                  className={`cursor-pointer  text-white bg-primary-300 rounded-l-md py-1 cursor-pointer ${
                    isOpen[index] ? "bg-primary-300" : "bg-back-800"
                  }`}
                  onClick={() => setOpen(s.key, !isOpen[index])}
                  style={{ writingMode: "vertical-lr" }}
                >
                  <div className="text-xs">{!isOpen ? s.label : s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </Allotment.Pane>
        {props.sidebars?.map((sidebar, index) => (
          <Allotment.Pane
            preferredSize={isOpen[index] ? "20%" : "0%"}
            visible={isOpen[index] && sidebar != undefined}
          >
            <div
              className={`flex flex-col flex-grow dark:bg-slate-800 bg-gray-100 border-l-2 border-l-gray-700 shadow-[35px_60px_-15px_rgba(0,0,0,0.3)] z-0 h-full @container`}
            >
              {isOpen[index] && sidebar.content}
            </div>
          </Allotment.Pane>
        ))}
      </Allotment>
    </div>
  );
};
