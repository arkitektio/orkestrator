import { Message, MetaModel, ReservationID } from "./base";

export type UnreserveMessage = Message<
  {
    reservation: ReservationID;
  },
  MetaModel<"unreserve">
>;

export type UnreserveDoneMessage = Message<
  {
    reservation: ReservationID;
  },
  MetaModel<"unreserve_done">
>;
