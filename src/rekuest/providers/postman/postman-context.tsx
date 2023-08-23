import React, { useContext } from "react";
import {
  AcknowledgeMutationVariables,
  AssignMutationVariables,
  PostmanAssignationFragment,
  PostmanProvisionFragment,
  PostmanReservationFragment,
  ProvideMutationVariables,
  ReserveMutationVariables,
  UnassignMutationVariables,
  UnprovideMutationVariables,
  UnreserveMutationVariables,
} from "../../api/graphql";

export type Delay = {};

export type ArkitektContextType = Postman & {
  setPostman: (postman: Postman) => void;
};

export type AssignVariables = Exclude<AssignMutationVariables, "id">;
export type ReserveVariables = Omit<ReserveMutationVariables, "instanceId">;
export type ProvideVariables = Exclude<ProvideMutationVariables, "id">;
export type UnassignVariables = Exclude<UnassignMutationVariables, "id">;
export type UnreserveVariables = Exclude<UnreserveMutationVariables, "id">;
export type UnprovideVariables = Exclude<UnprovideMutationVariables, "id">;
export type AckVariables = Exclude<AcknowledgeMutationVariables, "id">;

export type Reservation = PostmanReservationFragment;
export type Provision = PostmanProvisionFragment;
export type Assignation = PostmanAssignationFragment;
export type Unreservation = { id: string };
export type Unprovision = { id: string };
export type Uassignation = { id: string };

export type Postman = {
  reserve: (x: ReserveVariables) => Promise<Reservation>;
  provide: (x: ProvideVariables) => Promise<Provision>;
  unreserve: (x: UnreserveVariables) => Promise<Unreservation>;
  unprovide: (x: UnprovideVariables) => Promise<Unprovision>;
  assign: (x: AssignVariables) => Promise<Assignation>;
  ack: (x: AckVariables) => Promise<Assignation>;
  unassign: (x: UnassignVariables) => Promise<Uassignation>;
};

const NO_POSTMAN_SET = "No postman set";

export const PostmanContext = React.createContext<ArkitektContextType>({
  reserve: async () => {
    throw new Error(NO_POSTMAN_SET);
  },
  provide: async () => {
    throw new Error(NO_POSTMAN_SET);
  },
  unreserve: async () => {
    throw new Error(NO_POSTMAN_SET);
  },
  unprovide: async () => {
    throw new Error(NO_POSTMAN_SET);
  },
  assign: async () => {
    throw new Error(NO_POSTMAN_SET);
  },
  ack: async () => {
    throw new Error(NO_POSTMAN_SET);
  },
  unassign: async () => {
    throw new Error(NO_POSTMAN_SET);
  },
  setPostman: (postman: Postman | undefined) => {
    throw new Error(
      "Set postman is not implemented. Do you have a Postman provider?"
    );
  },
});

export const usePostman = () => useContext(PostmanContext);
