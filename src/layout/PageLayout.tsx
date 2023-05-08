import { Popover, Transition } from "@headlessui/react";
import { Allotment } from "allotment";
import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { GiHelp } from "react-icons/gi";
import { usePopper } from "react-popper";
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
  help?: React.ReactNode;
}

export type HelpProps = {
  help: React.ReactNode;
};

export const HelpButton = (props: HelpProps) => {
  let [referenceElement, setReferenceElement] = useState();
  let [popperElement, setPopperElement] = useState();
  let { styles, attributes } = usePopper(referenceElement, popperElement, {
    placement: "right",
  });

  return (
    <Popover>
      <Popover.Button
        ref={setReferenceElement}
        className="absolute top-0 right-3 flex-initial sm:px-2 px-2 sm:py-3 py-2 text-primary-300"
      >
        <GiHelp />
      </Popover.Button>

      <Transition
        enter="transition duration-100 ease-out"
        enterFrom="transform scale-95 opacity-0"
        enterTo="transform scale-100 opacity-100"
        leave="transition duration-75 ease-out"
        leaveFrom="transform scale-100 opacity-100"
        leaveTo="transform scale-95 opacity-0"
      >
        {createPortal(
          <Popover.Panel
            ref={setPopperElement}
            style={styles.popper}
            {...attributes.popper}
            className="overflow-hidden rounded-lg drop-shadow-lg border-gray-300 ring-1 ring-black ring-opacity-5 z-100 max-w-lg m-3"
          >
            <div className="relative bg-white p-3 ">{props.help}</div>
          </Popover.Panel>,
          document.getElementById("destination") as HTMLElement
        )}
      </Transition>
    </Popover>
  );
};

export const PageLayout: React.FC<PageLayoutProps> = (props) => {
  const [isOpen, setIsOpen] = useState(
    props.sidebars?.map(
      (s) => localStorage[`${s.key}rightsidebar`] === "true"
    ) || []
  );
  const [reload, setReload] = useState(true);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    if (reload) {
      console.log(reload);
    }

    setIsOpen(
      props.sidebars?.map(
        (s) => localStorage[`${s.key}rightsidebar`] === "true"
      ) || []
    );

    return;
  }, [reload]);

  const setOpen = (key: string, open: boolean) => {
    localStorage.setItem(`${key}rightsidebar`, open ? "true" : "false");
    setReload(!reload);
  };

  return (
    <div className="flex flex-grow h-full w-full page-layout overflow-y-hidden relative">
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
            {props.help && <HelpButton help={props.help} />}
            <div
              className="flex-grow p-2 sm:p-4 overflow-y-auto w-full @container flex flex-col"
              data-enableselect="true"
            >
              {props.children}
            </div>
            <div className="absolute top-[1rem] right-0 flex flex-col gap-2">
              {props.sidebars?.map((s, index) => (
                <div
                  key={index}
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
              className={`flex flex-col flex-grow bg-back-850 border-l-2 border-l-gray-700 shadow-[35px_60px_-15px_rgba(0,0,0,0.3)] z-0 h-full @container p-3`}
            >
              {isOpen[index] && sidebar.content}
            </div>
          </Allotment.Pane>
        ))}
      </Allotment>
    </div>
  );
};
