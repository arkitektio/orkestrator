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

export type AssignRequest = {
  id: string;
  res: ListReservationFragment;
  defaults?: {
    [key: string]: any;
  };
};

export type MateOptions = {
  allowBatch: boolean;
};

export type Package = `@${string}` | `${string}`;
export type Interface = string;

export type Identifier = `${Package}/${Interface}`;

export type Modifier = "list" | "item";

export type Accept = `${Modifier}:${Identifier}`;

export type Partner = {
  identifier: Identifier;
  object: string;
};

export type Mate<T extends Accept = any> = {
  accepts: T[];

  action: (self: Partner, drops: Partner[]) => Promise<any>;
  label: React.ReactNode;
  className?: (options: { isOver: boolean }) => string | string;
  description?:
    | ((options: { self: Partner; drops: Partner[] }) => React.ReactNode)
    | React.ReactNode;
};

export type AdditionalMate = {
  action: (self: Partner, drops: Partner[]) => Promise<any>;
  label: React.ReactNode;
  className?: (options: { isOver: boolean }) => string | string;
  description?:
    | ((options: { self: Partner; drops: Partner[] }) => React.ReactNode)
    | React.ReactNode;
};

export type ArkitektContextType = {
  reservations?: ReservationsQuery;
  calculateMates: <T extends Accept>(over: T, self: Partner) => Mate<T>[];
  calculateSelfMates: <T extends Accept>(over: T, self: Partner) => Mate<T>[];
};

export const MaterContext = React.createContext<ArkitektContextType>({
  calculateMates: () => [],
  calculateSelfMates: () => [],
});

export const useMater = () => useContext(MaterContext);
