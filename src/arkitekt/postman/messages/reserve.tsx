import { Message, MetaModel, ReserveParams } from "./base";

export type ReserveMessage = Message<
  {
    node: string | null;
    template: string | null;
    params: ReserveParams;
  },
  MetaModel<"reserve">
>;

export type ReserveDoneMessage = Message<
  {
    reservation: string;
  },
  MetaModel<"reserve_done">
>;
