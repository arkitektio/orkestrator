import React from "react";
import { ActionButton } from "../layout/ActionButton";
import { NodeKind, ReservationStatus } from "../rekuest/api/graphql";
import { useRequester } from "../rekuest/postman/requester/requester-context";
import { useReserver } from "../rekuest/postman/reserver/reserver-context";

export type IProducersProps = {};

const Producers: React.FC<IProducersProps> = ({}) => {
  const { assign } = useRequester();
  const { reservations } = useReserver();

  const producerReservations = reservations?.reservations?.filter(
    (res) =>
      res?.node?.returns?.at(0)?.identifier?.startsWith("@mikro") &&
      !res?.node?.args?.find((n) => n?.identifier) &&
      res?.status == ReservationStatus.Active &&
      res.node?.kind == NodeKind.Function
  );

  if (producerReservations?.length == 0) return <></>;

  return (
    <>
      <span className="font-light text-xl dark:text-white">Producers </span>
      <div className="pt-2 pb-2 flex flex-row gap-4">
        {producerReservations?.map((res, index) => (
          <div key={index}>
            {res?.id && res?.node?.id && (
              <ActionButton
                onAction={async () => {
                  await assign({ reservation: res });
                }}
                label={res?.title || res?.node?.name}
              />
            )}
          </div>
        ))}
      </div>
    </>
  );
};

export { Producers };
