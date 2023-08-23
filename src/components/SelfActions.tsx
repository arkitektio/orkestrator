import React from "react";
import { useNavigate } from "react-router";
import { notEmpty } from "../floating/utils";
import { ActionButton } from "../layout/ActionButton";
import {
  ListReservationFragment,
  ReservationStatus,
} from "../rekuest/api/graphql";
import { useRequester } from "../rekuest/providers/requester/requester-context";
import { useReserver } from "../rekuest/providers/reserver/reserver-context";

export interface SelfActionsProps {
  type: `${string}/${string}`;
  object: string;
  limit?: number;
  buttonClassName?: (res: ListReservationFragment) => string;
}

export const SelfActions: React.FC<SelfActionsProps> = ({
  type,
  object,
  limit,
  buttonClassName = (res) =>
    `flex-1 text-white shadow-md ${
      res.status == ReservationStatus.Active
        ? "bg-primary-300 shadow-primary-800/30 hover:shadow-primary-400/60 border-primary-300"
        : "bg-gray-800 border-gray-800  "
    }  disabled:shadow-none font-semibold items-center cursor-pointer z-50 border  p-3 rounded-xl disabled:bg-gray-800 disabled:border-gray-800 truncate hover:bg-primary-400 disabled:cursor-not-allowed`,
}) => {
  const { reservations } = useReserver();
  const { assign } = useRequester();
  const navigate = useNavigate();

  let available_res = reservations?.reservations
    ?.filter((res) => res?.node?.args?.at(0)?.identifier == type)
    .filter(notEmpty)
    .sort((a, b) => (a.status == ReservationStatus.Active ? -1 : 1));

  available_res = available_res?.slice(0, limit || available_res?.length);

  return (
    <>
      {available_res?.map((res) => (
        <ActionButton
          label={res.title || res.node?.name || "Unknown"}
          description={res.node.kind || "No description"}
          onAction={async () => {
            let selfkey = res?.node?.args?.at(0)?.key;
            if (res.status == ReservationStatus.Active && selfkey) {
              assign({ reservation: res, defaults: { [selfkey]: object } });
            } else {
              navigate(`/user/rekuest/reservations/${res.id}`);
            }
          }}
        />
      ))}
    </>
  );
};
