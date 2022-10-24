import React, { useContext } from "react";
import {
  AcknowledgeMutationFn,
  AgentsQuery,
  AssignMutationFn,
  AssignMutationVariables,
  ListReservationFragment,
  MyReservationsQuery,
  ProvideMutationFn,
  ProvisionsQuery,
  RequestsQuery,
  ReservationsQuery,
  ReserveMutationFn,
  UnassignMutationFn,
  UnprovideMutationFn,
  UnreserveMutationFn,
} from "../../api/graphql";

export type ArkitektContextType = {
  reservations?: ReservationsQuery;
  requests?: RequestsQuery;
  provisions?: ProvisionsQuery;
  agents?: AgentsQuery;
  reserve: ReserveMutationFn;
  unreserve: UnreserveMutationFn;
  provide: ProvideMutationFn;
  unprovide: UnprovideMutationFn;
  assign: AssignMutationFn;
  ack: AcknowledgeMutationFn;
  unassign: UnassignMutationFn;
};

export const PostmanContext = React.createContext<ArkitektContextType>({
  reserve: null as unknown as ReserveMutationFn,
  provide: null as unknown as ProvideMutationFn,
  unreserve: null as unknown as UnreserveMutationFn,
  unprovide: null as unknown as UnprovideMutationFn,
  assign: null as unknown as AssignMutationFn,
  ack: null as unknown as AcknowledgeMutationFn,
  unassign: null as unknown as UnassignMutationFn,
});

export const usePostman = () => useContext(PostmanContext);

export const NoPostmanContext = React.createContext<any>({});

export const useNoPostman = () => useContext(NoPostmanContext);
