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

export const DialogProvider = ({
  children,
  registeredDialogs,
}: {
  children: React.ReactNode;
  registeredDialogs?: {
    [key: string]: ComponentType<
      Submit<any> & { [key: string]: string | undefined }
    >;
  };
}) => {
  const [params, setParams] = useSearchParams();

  const [Component, setComponent] = React.useState<
    React.ReactNode | undefined
  >();
  const focusRef = useRef<HTMLButtonElement>(null);

  const show = (
    register: string,
    props: { [key: string]: string | undefined } = {}
  ) => {
    console.log("show", register);
    console.log("props", registeredDialogs);
    if (registeredDialogs && registeredDialogs[register]) {
      let Component = registeredDialogs[register];

      const p = new CancelablePromise((resolve, rejects, onCancel) => {
        const submit = (endState: any) => {
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
    }
  };

  useEffect(() => {
    if (params.get("dialog")) {
      console.log("showing dialog");

      let props: { [key: string]: string } = {};
      for (let [key, value] of params.entries()) {
        if (key.startsWith("dialog-")) {
          props[key.replace("dialog-", "")] = value;
        }
      }

      show(params.get("dialog") as string, props);
    }
  }, [params]);

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
