import React from "react";
import {
  ListReservationFragment,
  ReservationStatus,
  useMyReservationsQuery,
} from "../rekuest/api/graphql";
import { AdditionalMate, Mate } from "../rekuest/postman/mater/mater-context";
import { useRequester } from "../rekuest/postman/requester/requester-context";
import { useReserver } from "../rekuest/postman/reserver/reserver-context";
import { notEmpty } from "../floating/utils";
import { Reservation } from "../linker";
import { ResponsiveGrid } from "./layout/ResponsiveGrid";
import { withRekuest } from "../rekuest";
import { useRequesterMate } from "../mates/reservation/useRequesterMate";
import { ReservationCard } from "../rekuest/components/cards/ReservationCard";

const MyReservations: React.FC<{}> = () => {
  const { data } = withRekuest(useMyReservationsQuery)();
  const requesterMate = useRequesterMate();

  return (
    <>
      <Reservation.ListLink>
        <span className="font-light text-xl dark:text-white">
          This app uses
        </span>
      </Reservation.ListLink>
      <ResponsiveGrid>
        {data?.myreservations?.filter(notEmpty).map((res, index) => (
          <ReservationCard
            key={index}
            reservation={res}
            mates={[requesterMate(res)]}
          />
        ))}
      </ResponsiveGrid>
    </>
  );
};

export { MyReservations };
