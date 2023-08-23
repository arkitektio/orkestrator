import { useAutoAnimate } from "@formkit/auto-animate/react";
import React from "react";
import { ActionButton } from "../layout/ActionButton";
import { NodeKind, ReservationStatus } from "../rekuest/api/graphql";
import { useRequester } from "../rekuest/providers/requester/requester-context";
import { useReserver } from "../rekuest/providers/reserver/reserver-context";

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

export { Generators };
