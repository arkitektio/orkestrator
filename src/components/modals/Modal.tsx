/* This example requires Tailwind CSS v2.0+ */
import { Dialog, Transition } from "@headlessui/react";
import { Fragment, ReactNode, useState } from "react";
import { ModalContext } from "./modal-context";

export type ModalProps = {
  setShow?: (show: boolean) => void;
  label?: string;
  child?: React.ReactNode;
  className?: string;
  children: ReactNode;
};

export const Modal: React.FC<ModalProps> = ({
  children,
  className,
  setShow,
  label,
  child,
}) => {
  const [open, setOpen] = useState(false);

  const close = () => {
    setOpen(false);
  };

  return (
    <>
      <Transition.Root show={open} as={Fragment}>
        <Dialog
          as="div"
          static
          className="fixed z-10 inset-0 overflow-y-auto"
          open={open}
          onClose={close}
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
              <div>
                <ModalContext.Provider value={{ show: open || false, close }}>
                  {children}
                </ModalContext.Provider>
              </div>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition.Root>

      {child && (
        <div
          onClick={(e) => {
            setOpen(true);
            e.stopPropagation();
            e.preventDefault();
          }}
        >
          {child}
        </div>
      )}
      {label && (
        <button
          type="button"
          className={
            className ||
            "bg-white hover:bg-gray-100 text-gray-800 font-semibold py-2 px-4 border border-gray-400 rounded shadow"
          }
          onClick={(e) => {
            setOpen(true);
            e.stopPropagation();
            e.preventDefault();
          }}
        >
          label
        </button>
      )}
    </>
  );
};

export type ModalButtonProps = {
  className?: string;
  child: ReactNode;
  children?: ReactNode;
};

export const ModalButton: React.FC<ModalButtonProps> = (props) => {
  const [modalOpen, setmodalOpen] = useState(false);

  return (
    <Modal setShow={setmodalOpen} child={props.child}>
      {props.children}
    </Modal>
  );
};
