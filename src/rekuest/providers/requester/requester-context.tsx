import React, { useContext } from "react";
import {
  AssignMutation,
  AssignMutationVariables,
  ListReservationFragment,
  UnassignMutationVariables,
} from "../../api/graphql";

export type UnassignOptions = UnassignMutationVariables;

export type AssignOptions = AssignMutationVariables;

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
    this.reject.bind(this);
    this.resolve.bind(this);
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

export type AssignRequest = {
  id: string;
  defered: Defered<AssignMutation["assign"]>;
  variables: AssignRequestVariables;
};

export type AssignRequestVariables = {
  reservation: ListReservationFragment;
  defaults?: { [key: string]: any };
};

export type ResolvedAssignRequest = {
  id: string;
  defered: Defered<AssignMutation["assign"]>;
  options: AssignMutationVariables;
};

export type RequesterContextType = {
  pending: AssignRequest[];
  resolve: (request: ResolvedAssignRequest) => Promise<any>;
  reject: (request: AssignRequest) => void;
  assign: (
    request: AssignRequestVariables
  ) => Promise<AssignMutation["assign"]>;
  unassign: (options: UnassignOptions) => void;
};

export const RequesterContext = React.createContext<RequesterContextType>({
  assign: async () => {
    throw Error("Not implemented");
  },
  unassign: () => {},
  resolve: async () => {},
  reject: async () => {},
  pending: [],
});

export const useRequester = () => useContext(RequesterContext);
