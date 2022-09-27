import {
  AssignationLogLevel,
  ProvisionStatus,
  ReservationStatus,
} from "../../arkitekt/api/graphql";

export interface LogMessage {
  level: AssignationLogLevel;
  message: string;
}

export enum AssignEventType {
  YIELD = "YIELD",
  ERROR = "ERROR",
  RETURN = "RETURN",
  DONE = "DONE",
  CANCEL = "CANCEL",
}

export interface AssignEvent {
  type: AssignEventType;
  diagram_id: string;
  message: string;
  exception: string;
  returns?: any[] | [];
}

export enum ProvideEventType {
  TRANSITION = "TRANSITION",
}

export interface ProvideEvent {
  type: ProvideEventType;
  diagram_id: string;
  message: string;
  state: ReservationStatus;
  reservation: string;
}

export enum ReserveEventType {
  TRANSITION = "PROVISION_TRANSITION",
}

export interface ReserveEvent {
  type: ReserveEventType;
  provision: string;
  state: ProvisionStatus;
}

export interface LogInterface {
  assignEvents?: AssignEvent[];
  provideEvents?: ProvideEvent[];
}
