import { Dialog, Transition } from "@headlessui/react";
import React, { Fragment, useRef } from "react";

export interface ModalProps {
  focusRef: React.RefObject<HTMLButtonElement>;
  show: boolean;
  setShow: (x: boolean) => void;
}

export const modalfy = <
  T extends {
    focusRef: React.RefObject<HTMLButtonElement>;
    show: boolean;
    setShow: (x: boolean) => void;
  }
>(
  Component: React.FC<T>
) => {
  const ModalComponent: React.FC<Omit<T, "focusRef">> = (props) => {
    const focusRef = useRef<HTMLButtonElement>(null);

    return (
      <Transition.Root show={props.show} as={Fragment}>
        <Dialog
          as="div"
          static
          initialFocus={focusRef}
          className="fixed z-10 inset-0 overflow-y-auto"
          open={props.show}
          onClose={() => props.setShow(false)}
        >
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <Dialog.Overlay className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
            </Transition.Child>
            <Transition.Child
              as={"div"}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Component {...(props as any)} focusRef={focusRef} />
            </Transition.Child>
          </div>
        </Dialog>
      </Transition.Root>
    );
  };

  return ModalComponent;
};
