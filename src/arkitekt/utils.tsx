import { AssignationStatus, ReservationStatus } from "./api/graphql";


export const colorFromAssignationStatus = (status: AssignationStatus | undefined) => {
    switch (status) {
      case AssignationStatus.Done:
        return "green";
      case AssignationStatus.Critical:
        return "red";
      default:
        return "white";
    }
  };

  export const colorFromReservationStatus = (status: ReservationStatus | undefined) => {
    switch (status) {
      case ReservationStatus.Active:
        return "green";
      case ReservationStatus.Critical:
        return "red";
      default:
        return "white";
    }
  };