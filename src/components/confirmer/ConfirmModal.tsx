/* This example requires Tailwind CSS v2.0+ */
import { Dialog, Transition } from "@headlessui/react";
import { Fragment, useRef } from "react";
import { useConfirm } from "../../providers/confirmer/confirmer-context";

export type ConfirmModalModalProps = {};

export type ConfirmModalState = {
  message: string;
  subtitle?: string;
  confirmLabel?: string;
};

export const ConfirmModal: React.FC<ConfirmModalModalProps> = () => {
  const { state } = useConfirm();
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  return (
    <Transition.Root show={state != undefined} as={Fragment}>
      <Dialog
        as="div"
        static
        className="fixed z-10 inset-0 overflow-y-auto"
        open={state != undefined}
        initialFocus={cancelButtonRef}
        onClose={() => state && state.defered.reject("User clicked outside")}
      >
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
                  {state?.message || " No message"}
                </Dialog.Title>

                <div className="sm:flex sm:items-center w-full">
                  <div className="mt-1 text-center sm:mt-0  sm:text-left w-full">
                    <div className="mt-2 w-full text-slate-200">
                      {state?.subtitle ? (
                        <span className="text-sm font-light">
                          {state.subtitle}
                        </span>
                      ) : (
                        <> </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="bg-slate-900 px-4 pb-2 sm:flex sm:flex-row-reverse">
                  <button
                    type="button"
                    onClick={() => state && state.defered.resolve(true)}
                    className="mt-3 w-full inline-flex rounded-md border border-transparent shadow-sm px-4 py-2  bg-yellow-400 text-base font-medium text-white hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    {" "}
                    {state?.confirmLabel ? state?.confirmLabel : "Confirm"}
                  </button>
                  <button
                    ref={cancelButtonRef}
                    type="button"
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 focus:outline-none hover:bg-red-200 hover:text-white sm:ml-3 sm:w-auto sm:text-sm"
                    onClick={() =>
                      state && state.defered.reject("User cancelled")
                    }
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition.Root>
  );
};
