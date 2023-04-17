import { Dialog, Transition } from "@headlessui/react";
import CancelablePromise from "cancelable-promise";
import React, {
  ComponentType,
  Fragment,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useSearchParams } from "react-router-dom";
import { ConfirmModalState } from "../../components/confirmer/ConfirmModal";

export type Submit<T extends {} | undefined = undefined> = {
  submit: (endState: T) => void;
  buttonref: React.RefObject<HTMLButtonElement>;
  reject: (reason?: any) => void;
};

export type ConfirmContextType = {
  ask: <T extends {}, P>(
    component: ComponentType<Submit<T> & P>,
    props: Partial<P>
  ) => CancelablePromise<T>;
};

export const DialogContext = React.createContext<ConfirmContextType>({
  ask: null as unknown as ConfirmContextType["ask"],
});

export const useDialog = () => useContext(DialogContext);

export type EndState = {
  hallo: string;
};

export type ModalProps = {
  x: string;
};

export const Modal = (props: ModalProps) => {
  return <></>;
};

export const DialogProvider = ({ children }: { children: React.ReactNode }) => {
  const [Component, setComponent] = React.useState<
    React.ReactNode | undefined
  >();
  const focusRef = useRef<HTMLButtonElement>(null);

  const ask = <T extends {}, P>(
    Component: ComponentType<Submit<T> & P>,
    props: P
  ): CancelablePromise<T> => {
    const p = new CancelablePromise<T>((resolve, rejects, onCancel) => {
      const submit = (endState: T) => {
        setComponent(undefined);
        resolve(endState);
      };

      const reject = (reason?: any) => {
        setComponent(undefined);
        rejects(reason);
      };

      const onCancelHandler = () => {
        setComponent(undefined);
      };
      onCancel(onCancelHandler);

      setComponent(
        <Transition.Root show={Component != undefined} as={"div"}>
          <Dialog
            as="div"
            static
            initialFocus={focusRef}
            className="fixed z-10 inset-0 overflow-y-auto"
            open={Component != undefined}
            onClose={() => {
              setComponent(undefined), reject("User canceled");
            }}
          >
            <Component
              {...props}
              submit={submit}
              reject={reject}
              buttonref={focusRef}
            />
          </Dialog>
        </Transition.Root>
      );
    });
    return p;
  };

  return (
    <DialogContext.Provider value={{ ask }}>
      {Component && Component}

      {children}
    </DialogContext.Provider>
  );
};
