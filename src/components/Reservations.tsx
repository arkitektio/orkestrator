import React from "react";
import { useNavigate } from "react-router";
import {
  ListReservationFragment,
  ReservationStatus,
} from "../arkitekt/api/graphql";
import { AdditionalMate, Mate } from "../arkitekt/postman/mater/mater-context";
import { useRequester } from "../arkitekt/postman/requester/requester-context";
import { useReserver } from "../arkitekt/postman/reserver/reserver-context";
import { notEmpty } from "../floating/utils";
import { Reservation } from "../linker";
import { ResponsiveGrid } from "./layout/ResponsiveGrid";

export type IMyReservationsProps = {};

export const colorFromReserveStatus = (
  status: ReservationStatus | undefined
) => {
  switch (status) {
    case ReservationStatus.Active:
      return "text-md border-green-300 text-green-300 shadow-green-200/20";
    case ReservationStatus.Critical:
      return "border-red-900 shadow-red-200/50 text-red-900";
    case ReservationStatus.Canceling:
      return "bg-orange-100 shadow-orange-200/50 text-orange-100";
    case ReservationStatus.Routing:
      return " border-yellow-500 shadow-yellow-200/50 text-yellow-500";
    case ReservationStatus.Rerouting:
      return " border-yellow-500 shadow-yellow-200/50 text-yellow-500 ";
    case ReservationStatus.Providing:
      return "  border-yellow-500 shadow-yellow-200/50 text-yellow-500";
    case ReservationStatus.Cancelled:
      return " shadow-blue-200/50";
    case ReservationStatus.Disconnect:
      return "text-md border-gray-300 text-gray-300 shadow-red-200/20 opacity-50 ";
    case ReservationStatus.Waiting:
      return " border-yellow-500 shadow-yellow-200/50";
    default:
      return "dark:bg-slate-700 dark:text-slate-100";
  }
};

export const ReservationItem = ({
  reservation,
}: {
  reservation: ListReservationFragment;
}) => {
  const { unreserve } = useReserver();
  const { assign } = useRequester();

  return (
    <Reservation.Smart
      showSelfMates={true}
      placement="bottom"
      object={reservation.id}
      dragClassName={({ isOver, canDrop, isSelected, isDragging }) =>
        `rounded border overflow-hidden shadow-md p-3 ${colorFromReserveStatus(
          reservation?.status
        )} ${isOver && !isDragging && "border-primary-200 border"} ${
          isDragging && "border-primary-200 border"
        } ${isSelected && "ring-1 ring-primary-200 "}`
      }
      additionalMates={(accept, isself) => {
        let mates: AdditionalMate[] = [];

        if (!isself) {
          return mates;
        }

        if (reservation.status === ReservationStatus.Active) {
          mates.push({
            action: async () => {
              await assign({ reservation: reservation });
            },
            label: "Assign",
          });
        }

        return mates.concat([
          {
            action: async () => {
              await unreserve({ reservation: reservation.id });
            },
            label: "Unreserve",
          },
        ]);
      }}
    >
      <Reservation.DetailLink
        className={({ isActive }) =>
          "cursor-pointer " + (isActive ? "text-primary-300" : "")
        }
        object={reservation?.id}
      >
        <span className="truncate">
          {reservation?.title || reservation.node?.name}
        </span>
      </Reservation.DetailLink>
      {reservation?.title && (
        <p className="font-semibold text-xs">{reservation?.node?.name}</p>
      )}
      {reservation?.waiter?.registry && (
        <p className=" font-semibold text-xs">
          {reservation.status === ReservationStatus.Disconnect &&
            "Disconnected"}
          {reservation.status === ReservationStatus.Active && "Connected"}
        </p>
      )}
      {reservation?.status == ReservationStatus.Waiting && (
        <div className="text-xs">
          Waiting for the Provider to become active...
        </div>
      )}
      {reservation?.status == ReservationStatus.Rerouting && (
        <div className="text-xs">Reservation requires rerouting...</div>
      )}
    </Reservation.Smart>
  );
};

const Reservations: React.FC<IMyReservationsProps> = () => {
  const { reservations } = useReserver();

  return (
    <>
      <Reservation.ListLink className="font-light text-xl dark:text-white">
        Reservations of this App
      </Reservation.ListLink>
      <ResponsiveGrid>
        {reservations?.reservations?.filter(notEmpty).map((res, index) => (
          <ReservationItem key={index} reservation={res} />
        ))}
      </ResponsiveGrid>
    </>
  );
};

export { Reservations };
