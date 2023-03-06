/* This example requires Tailwind CSS v2.0+ */
import { Dialog, Transition } from "@headlessui/react";
import { Fragment, useRef } from "react";

export type AlertModalModalProps = {
  open: boolean;
  state?: AlertModalState;
  onAccept: () => void;
  onReject: () => void;
};

export type AlertModalState = {
  message: string;
  subtitle?: string;
  confirmLabel?: string;
};

export const AlertModal: React.FC<AlertModalModalProps> = ({
  open,
  state,
  onAccept,
  onReject,
}) => {
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      <Transition.Root show={open} as={Fragment}>
        <Dialog
          as="div"
          static
          className="fixed z-10 inset-0 overflow-y-auto"
          open={open}
          initialFocus={cancelButtonRef}
          onClose={onReject}
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
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <div className="border-2 border-red-500 inline-block align-middle bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all mt-20 sm:align-middle sm:max-w-lg sm:w-full">
                <div className="bg-white px-4 pt-2 pb-2">
                  <div className="p-2">
                    <div className="mt-1 text-center sm:mt-0 sm:ml-4 sm:text-left">
                      <Dialog.Title
                        as="h4"
                        className="text-xl mt-2 mb-4 leading-6 font-bold text-red-500"
                      >
                        {state?.message || " No message"}
                      </Dialog.Title>
                      <div>
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
                </div>
                <div className="bg-gray-50 px-4 pb-2 sm:flex sm:flex-row-reverse">
                  <button
                    type="button"
                    ref={cancelButtonRef}
                    onClick={() => onAccept()}
                    className="mt-3 w-full inline-flex rounded-md border border-transparent shadow-sm px-4 py-2  bg-red-500 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    {" "}
                    {state?.confirmLabel ? state?.confirmLabel : "Acknowledge"}
                  </button>
                </div>
              </div>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition.Root>
    </>
  );
};
