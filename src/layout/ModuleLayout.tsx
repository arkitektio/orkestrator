import { Allotment } from "allotment";
import React, { useEffect, useState } from "react";

export type Sidebar = {
  label: string;
  key: string;
  content: React.ReactNode;
};

export interface ModuleLayoutProps {
  children: React.ReactNode;
  sidebars?: Sidebar[];
}

export const ModuleLayout: React.FC<ModuleLayoutProps> = (props) => {
  const [isOpen, setIsOpen] = useState(
    props.sidebars?.map(
      (s) => localStorage[`${s.key}leftsidebar`] === "true"
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
    <div className={"flex-grow flex flex-row"}>
      <Allotment>
        {props.sidebars?.map((sidebar, index) => (
          <Allotment.Pane
            preferredSize={isOpen[index] ? "20%" : "0%"}
            visible={isOpen[index] && sidebar != undefined}
          >
            <div
              className={`flex flex-col flex-grow dark:bg-slate-800 bg-gray-100 border-r-2 border-r-gray-700 shadow-element z-0 h-full @container`}
            >
              {sidebar.content}
            </div>
          </Allotment.Pane>
        ))}
        <Allotment.Pane
          preferredSize={isOpen ? "80%" : "100%"}
          className="flex flex-grow relative"
        >
          <div
            className="flex-grow flex  w-full h-full"
            data-enableselect="true"
          >
            {props.children}
          </div>
          <div className="absolute bottom-[1rem] left-0 flex flex-col gap-2">
            {props.sidebars?.map((s, index) => (
              <div
                key={index}
                className={`cursor-pointer  text-white bg-primary-300 rounded-r-md py-1 cursor-pointer ${
                  isOpen[index] ? "bg-primary-300" : "bg-back-800"
                }`}
                onClick={() => setOpen(s.key, !isOpen[index])}
                style={{ writingMode: "vertical-lr" }}
              >
                <div className="text-xs">{!isOpen ? s.label : s.label}</div>
              </div>
            ))}
          </div>
        </Allotment.Pane>
      </Allotment>
    </div>
  );
};
