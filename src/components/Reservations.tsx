import React from "react";
import { notEmpty } from "../floating/utils";
import { Reservation } from "../linker";
import { useRequesterMate } from "../mates/reservation/useRequesterMate";
import { ReservationCard } from "../rekuest/components/cards/ReservationCard";
import { useReserver } from "../rekuest/postman/reserver/reserver-context";
import { ResponsiveContainerGrid } from "./layout/ResponsiveContainerGrid";

export type IMyReservationsProps = {};

const Reservations: React.FC<IMyReservationsProps> = () => {
  const { reservations } = useReserver();
  const requesterMate = useRequesterMate();

  return (
    <>
      <Reservation.ListLink className="font-light text-xl dark:text-white">
        This app uses
      </Reservation.ListLink>
      <div className="mt-2 mb-4">
        <ResponsiveContainerGrid>
          {reservations?.reservations?.filter(notEmpty).map((res, index) => (
            <ReservationCard
              key={index}
              reservation={res}
              mates={[requesterMate(res)]}
            />
          ))}
        </ResponsiveContainerGrid>
      </div>
    </>
  );
};

export { Reservations };
