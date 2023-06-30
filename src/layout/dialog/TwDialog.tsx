import { Dialog, Transition } from "@headlessui/react";
import { Fragment } from "react";

export type TwDialogProps = {
  children: React.ReactNode;
  title: string;
  buttons: React.ReactNode;
};

export const TwDialog = <T extends {}>(props: TwDialogProps) => {
  return (
    <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0 ">
        
      <Transition.Child
        as={Fragment}
        enter="ease-out duration-300"
        enterFrom="opacity-0"
        enterTo="opacity-100"
        leave="ease-in duration-200"
        leaveFrom="opacity-100"
        leaveTo="opacity-0"
      >
        <Dialog.Overlay className="fixed inset-0 bg-black bg-opacity-40 transition-opacity" />
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
        <div className="shadow shadow-2xl border border-back-800 inline-block align-middle bg-back-900 text-left text-slate-200 shadow-xl transform transition-all min-w-xl sm:my-8 sm:align-middle sm:max-w-2xl xl:max-w-4xl sm:w-full rounded-md">
           <div className="px-4 pt-2 pb-4 sm:p-6 sm:pb-4 rounded-lg @container">
                
          <Dialog.Title
            as="h3"
            className="text-sm font-semibold  text-slate-200 bg-slate-900"
          >
            {props.title}
          </Dialog.Title>

            <div className="sm:flex sm:items-center w-full">
              <div className="mt-1 text-center sm:mt-0  sm:text-left w-full">
                <div className="mt-2 w-full text-slate-200">
                  {props.children}
                </div>
              </div>
            </div>
          <div className="bg-slate-900 px-4 pb-2 sm:flex sm:flex-row-reverse">
            {props.buttons}
          </div>
          </div>
        </div>
      </Transition.Child>
    </div>
  );
};
