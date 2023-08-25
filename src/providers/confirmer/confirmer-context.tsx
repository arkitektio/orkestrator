import React, { useContext } from "react";

export type ConfirmFun = (request: ConfirmRequest) => Promise<boolean>;

export type ConfirmRequest = {
  message: string;
  subtitle?: string;
  confirmLabel?: string;
};

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

export type ConfirmModalState = ConfirmRequest & {
  defered: Defered;
};

export type ConfirmContextType = {
  confirm: ConfirmFun;
  state?: ConfirmModalState;
};

export const ConfirmContext = React.createContext<ConfirmContextType>({
  confirm: null as unknown as ConfirmFun,
});

export const useConfirm = () => useContext(ConfirmContext);
