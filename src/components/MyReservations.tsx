import React from "react";
import { notEmpty } from "../floating/utils";
import { RekuestReservation } from "../linker";
import { useRequesterMate } from "../mates/reservation/useRequesterMate";
import { withRekuest } from "../rekuest";
import { useReservationsQuery } from "../rekuest/api/graphql";
import { ReservationCard } from "../rekuest/components/cards/ReservationCard";
import { useSettings } from "../settings/settings-context";
import { ResponsiveGrid } from "./layout/ResponsiveGrid";

const MyReservations: React.FC<{}> = () => {
  const { settings } = useSettings();

  const { data } = withRekuest(useReservationsQuery)({
    fetchPolicy: "cache-and-network",
    variables: {
      instanceId: settings.instanceId,
    },
  });
  const requesterMate = useRequesterMate();

  return (
    <>
      <RekuestReservation.ListLink>
        <span className="font-light text-xl dark:text-white">
          This app uses
        </span>
      </RekuestReservation.ListLink>
      <ResponsiveGrid>
        {data?.reservations?.filter(notEmpty).map((res, index) => (
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
