import React from "react";
import { NodeKind, ReservationStatus } from "../arkitekt/api/graphql";
import { usePostman } from "../arkitekt/postman/graphql/postman-context";
import { useRequester } from "../arkitekt/postman/requester/requester-context";
import { useReserver } from "../arkitekt/postman/reserver/reserver-context";

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
              <button
                className="bg-primary-300 p-2 border rounded-md text-white hover:bg-primary-400 transition-colors"
                onClick={() => assign({ reservation: res })}
              >
                {res?.title || res?.node?.name}
              </button>
            )}
          </div>
        ))}
      </div>
    </>
  );
};

export { Producers };
