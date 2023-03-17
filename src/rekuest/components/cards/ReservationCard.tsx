import { Reservation } from "../../../linker";
import { MateFinder } from "../../../mates/types";
import { ListReservationFragment, ReservationStatus } from "../../api/graphql";

export type IMyReservationsProps = {};

export const colorFromStatus = (status: ReservationStatus | undefined) => {
  switch (status) {
    case ReservationStatus.Active:
      return "text-md border-green-300 text-green-300 shadow-green-200/20";
    case ReservationStatus.Critical:
      return "bg-gray-800 border-red-900 shadow-red-200/50";
    case ReservationStatus.Canceling:
      return "bg-orange-100  shadow-orange-200/50";
    case ReservationStatus.Routing:
      return "bg-yellow-100  border-yellow-500 shadow-yellow-200/50";
    case ReservationStatus.Rerouting:
      return "bg-yellow-100  border-yellow-500 shadow-yellow-200/50";
    case ReservationStatus.Providing:
      return "bg-yellow-200  border-yellow-500 shadow-yellow-200/50";
    case ReservationStatus.Cancelled:
      return "bg-gray-400 shadow-blue-200/50";
    case ReservationStatus.Disconnect:
      return "text-md border-gray-300 text-gray-300 shadow-red-200/20 opacity-30";
    case ReservationStatus.Waiting:
      return "bg-yellow-300 border-yellow-500 shadow-yellow-200/50";
    default:
      return "dark:bg-slate-700 dark:text-slate-100";
  }
};

export const ReservationCard = ({
  reservation,
  mates,
}: {
  reservation: ListReservationFragment;
  mates: MateFinder[];
}) => {
  return (
    <Reservation.Smart
      showSelfMates={true}
      placement="bottom"
      object={reservation.id}
      dragClassName={({ isOver, canDrop, isSelected, isDragging }) =>
        `rounded border overflow-hidden shadow-md p-3 ${colorFromStatus(
          reservation?.status
        )} ${isOver && !isDragging && "border-primary-200 border"} ${
          isDragging && "border-primary-200 border"
        } ${isSelected && "ring-1 ring-primary-200 "}`
      }
      mates={mates}
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
          Reserved by {reservation?.waiter?.registry?.app?.identifier}
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
