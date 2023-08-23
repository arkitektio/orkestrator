import {
  Args,
  Kwargs,
  Message,
  MetaModel,
  ReservationID,
  Returns,
} from "./base";

export type AssignMessage = Message<
  {
    reservation: ReservationID;
    args: Args;
    kwargs: Kwargs;
  },
  MetaModel<"assign">
>;

export type AssignReturnMessage = Message<
  {
    returns: Returns;
  },
  MetaModel<"assign_return">
>;
