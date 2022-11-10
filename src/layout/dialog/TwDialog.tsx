import { Dialog, Transition } from "@headlessui/react";
import { Children, Fragment, useRef } from "react";
import { ModalProps, Submit } from "./DialogProvider";

export type TwDialogProps = {
  children: React.ReactNode;
  title: string;
  buttons: React.ReactNode;
};

export const TwDialog = <T extends {}>(props: TwDialogProps) => {
  return (
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
        <div className="inline-block align-middle bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-white px-4 pt-2 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="mt-1 text-center sm:mt-0 sm:ml-4 sm:text-left">
                <Dialog.Title
                  as="h3"
                  className="text-xl mt-2 mb-4 leading-6 font-medium text-gray-900"
                >
                  {props.title}
                </Dialog.Title>
                <div className="mt-2 align-left text-left text-black">
                  {props.children}
                </div>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-4 pb-2 sm:flex sm:flex-row-reverse">
            {props.buttons}
          </div>
        </div>
      </Transition.Child>
    </div>
  );
};
