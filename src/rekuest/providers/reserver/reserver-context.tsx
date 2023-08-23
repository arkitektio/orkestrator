import React, { useContext } from "react";
import { PostmanReservationFragment } from "../../api/graphql";
import {
  ReserveVariables,
  UnreserveVariables,
} from "../postman/postman-context";

export type UnreserveOptions = UnreserveVariables;

export type ReserveOptions = ReserveVariables;

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

export type ReserveRequest = {
  id: string;
  defered: Defered<PostmanReservationFragment>;
  options: ReserveOptions;
};

export type ReserverContextType = {
  pending: ReserveRequest[];
  resolve: (request: ReserveRequest) => Promise<any>;
  reject: (request: ReserveRequest) => void;
  reserve: (options: ReserveOptions) => Promise<PostmanReservationFragment>;
  unreserve: (options: UnreserveOptions) => void;
};

export const ReserverContext = React.createContext<ReserverContextType>({
  reserve: async () => {
    throw Error("Not implemented");
  },
  unreserve: () => {},
  resolve: async () => {},
  reject: async () => {},
  pending: [],
});

export const useReserver = () => useContext(ReserverContext);
