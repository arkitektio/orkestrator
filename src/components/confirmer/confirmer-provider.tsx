import React, { useState } from "react";
import { ConfirmContext } from "./confirmer-context";
import { ConfirmModal, ConfirmModalState } from "./ConfirmModal";

export type IConfirmerProviderProps = { children: React.ReactNode };

export type Resolver<T> = (value: T) => void;
export type Rejector<T> = (value: T) => void;

export class Defered<Result extends any = any, RejectReason extends any = any> {
  resolver: Resolver<Result> | undefined;
  rejecter: Rejector<RejectReason> | undefined;

  constructor();
  constructor(
    resolve: Resolver<Result> | undefined = undefined,
    reject: Rejector<RejectReason> | undefined = undefined
  ) {
    this.resolver = resolve;
    this.rejecter = reject;
  }

  resolve(result: Result) {
    if (this.resolver) return this.resolver(result);
    console.log("No Resolver for this function");
  }

  reject(result: RejectReason) {
    if (this.rejecter) return this.rejecter(result);
    console.log("No Resolver for this function");
  }
}

const ConfirmerProvider: React.FC<IConfirmerProviderProps> = ({ children }) => {
  const [show, setShow] = useState(false);
  const [state, setState] = useState<ConfirmModalState | undefined>(undefined);
  const [defered, setDefered] = useState<Defered | null>(null);

  const handleAccept = () => {
    if (defered) {
      defered.resolve(true);
    }
    setShow(false);
  };

  const handleReject = () => {
    if (defered) {
      defered.reject(true);
    }
    setShow(false);
  };

  const confirm = (state: ConfirmModalState) => {
    var defered = new Defered();

    var promise = new Promise<boolean>((resolve, reject) => {
      defered.resolver = resolve;
      defered.rejecter = reject;
    });

    setDefered(defered);
    setState(state);
    setShow(true);

    return promise;
  };

  return (
    <>
      <ConfirmModal
        open={show}
        state={state}
        onAccept={handleAccept}
        onReject={handleReject}
      />
      <ConfirmContext.Provider
        value={{
          confirm: confirm,
        }}
      >
        {children}
      </ConfirmContext.Provider>
    </>
  );
};

export { ConfirmerProvider };
