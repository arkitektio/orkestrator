import React from "react";
import { notEmpty } from "../floating/utils";
import { ListRender } from "../layout/SectionTitle";
import { RekuestReservation } from "../linker";
import { useRequesterMate } from "../mates/reservation/useRequesterMate";
import { withRekuest } from "../rekuest";
import { useReservationsQuery } from "../rekuest/api/graphql";
import { ReservationCard } from "../rekuest/components/cards/ReservationCard";
import { useSettings } from "../settings/settings-context";

const MyReservedWorkflows: React.FC<{}> = () => {
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
    <ListRender title={

      <RekuestReservation.ListLink>
        <span className="font-light text-xl dark:text-white">
          Reserved Workflows
        </span>
      </RekuestReservation.ListLink>
    }
     array={data?.reservations?.filter(notEmpty).filter(r => r.node.interfaces?.includes("workflow"))}
     >
      {(res, index) => (
          <ReservationCard
            key={index}
            reservation={res}
            mates={[requesterMate(res)]}
          />
        )}

      </ListRender>
    </>
  );
};

export { MyReservedWorkflows };
