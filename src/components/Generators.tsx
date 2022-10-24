import { useAutoAnimate } from "@formkit/auto-animate/react";
import React from "react";
import { NodeKind, ReservationStatus } from "../rekuest/api/graphql";
import { usePostman } from "../rekuest/postman/graphql/postman-context";
import { useRequester } from "../rekuest/postman/requester/requester-context";
import { useReserver } from "../rekuest/postman/reserver/reserver-context";

export type IGeneratorsProps = {};

const Generators: React.FC<IGeneratorsProps> = ({}) => {
  const { reservations } = useReserver();
  const { assign } = useRequester();
  const [parent] = useAutoAnimate<HTMLDivElement>(/* optional config */);
  const generatorReservations = reservations?.reservations?.filter(
    (res) =>
      res?.node?.args?.length === 0 &&
      res?.status == ReservationStatus.Active &&
      res.node?.kind == NodeKind.Generator
  );

  if (generatorReservations?.length == 0) return <></>;

  return (
    <>
      <span className="font-light text-xl dark:text-white">Generators </span>
      <div className="pt-2 pb-2 flex flex-row gap-4" ref={parent}>
        {generatorReservations?.map((res, index) => (
          <div key={index}>
            {res?.reference && res?.node?.id && (
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

export { Generators };
