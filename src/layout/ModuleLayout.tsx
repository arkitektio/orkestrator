import { Transition } from "@headlessui/react";
import React, { useEffect, useState } from "react";

export interface ModuleLayoutProps {
  children: React.ReactNode;
  sidebar?: React.ReactNode;
}

export const ModuleLayout: React.FC<ModuleLayoutProps> = (props) => {
  const [isOpen, setIsOpen] = useState(localStorage.leftsidebarOpen === "true");
  const [reload, setReload] = useState(true);

  useEffect(() => {
    if (reload) {
      console.log(reload);
    }

    setIsOpen(localStorage.leftsidebarOpen === "true");

    return;
  }, [reload]);

  const setOpen = (open: boolean) => {
    localStorage.setItem("leftsidebarOpen", open ? "true" : "false");
    setReload(!reload);
  };

  return (
    <div className={"flex-grow flex flex-row"}>
      {props.sidebar && (
        <>
          <Transition
            show={isOpen}
            enter="transition-[width] ease-out duration-100 flex flex-initial"
            enterFrom="w-[0vw]"
            enterTo="sm:w-[15vw] w-[80vw]"
            leave="transition-[width] ease-in duration-100"
            leaveFrom="sm:w-[15vw] w-[80vw]"
            leaveTo="w-[0vw]"
          >
            <div
              className={`w-full dark:bg-slate-800 bg-gray-200 dark:border-r dark:border-gray-800 shadow-element z-0 h-full`}
            >
              {props.sidebar}
            </div>
          </Transition>
          <button
            className={
              "flex-initial text-white h-full opacity-0 hover:opacity-100 transition-opacity sm:w-2 w-3 bg-gradient-to-r from-primary-200 to-transparent"
            }
            onClick={() => setOpen(!isOpen)}
          ></button>
        </>
      )}
      <div className={"flex-grow h-full flex"} style={{ zIndex: 0 }}>
        {props.children}
      </div>
    </div>
  );
};
