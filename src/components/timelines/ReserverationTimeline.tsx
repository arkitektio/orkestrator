import React, { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import {
  DetailReservationFragment,
  ReservationLogLevel,
  useLinkableProvisionsQuery,
  useLinkMutation,
  useUnlinkMutation,
} from "../../rekuest/api/graphql";
import { ProvisionPulse } from "../../rekuest/components/generic/StatusPulse";
import { SmartModel } from "../../rekuest/selection/SmartModel";
import { notEmpty } from "../../floating/utils";
import { Provision } from "../../linker";
import { UserEmblem } from "../../lok/components/UserEmblem";
import { useAlert } from "../alerter/alerter-context";
import { ReserveEvent } from "./types";
import { withRekuest } from "../../rekuest";
import { ProvisionCard } from "../../rekuest/components/cards/ProvisionCard";
import { useLinkProvisionMate } from "../../mates/provision/useLinkProvisionMate";
import { useUnlinkProvisionMate } from "../../mates/provision/useUnlinkProvisionMate";

export type ReservationTimelineProps = {
  reservation: DetailReservationFragment;
};

type ArrayElement<ArrayType extends readonly unknown[]> =
  ArrayType extends readonly (infer ElementType)[] ? ElementType : never;

export const ReservationTimeline: React.FC<ReservationTimelineProps> = ({
  reservation,
}) => {
  let { data: provisions } = withRekuest(useLinkableProvisionsQuery)({
    variables: { reservation: reservation?.id },
  });

  const linkMate = useLinkProvisionMate(reservation);
  const unlinkMate = useUnlinkProvisionMate(reservation);

  const [unlink] = withRekuest(useUnlinkMutation)();
  const [link] = withRekuest(useLinkMutation)();
  const { alert } = useAlert();

  return (
    <div className="flex flex-col h-full w-100">
      <div className="flex-grow flex flex-col">
        <div className="flex-initial mt-3">
          {reservation.provision && (
            <div className="border bg-white border-gray-600 rounded p-4 shadow-xl cursor-pointer relative flex flex-row w-80">
              Is managed by another provision
              <ProvisionPulse status={reservation.provision.status} />
              <NavLink
                className="flex-initial font-light cursor-pointer ml-2"
                to={`/dashboard/provisions/${reservation.provision?.id}`}
              >
                {reservation.provision?.creator?.username}
              </NavLink>{" "}
            </div>
          )}
          <div className="flex flex-row gap-2">
            <div className="w-80 bg-white border mt-2 border-gray-600 rounded p-4  ">
              <div className="font-light mb-2 text-black text-xl">
                Parameters
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>auto provide</div>
                <div className="ml-2">
                  {reservation?.params?.autoProvide == true ? "Yes" : "No"}
                </div>
                <div>auto unprovide </div>
                <div className="ml-2">
                  {reservation?.params?.autoUnprovide == true ? "Yes" : "No"}
                </div>
                <div>minimalInstances </div>
                <div className="ml-2">
                  {reservation?.params?.minimalInstances}
                </div>
                <div>desired Instances </div>
                <div className="ml-2">
                  {reservation?.params?.desiredInstances}
                </div>
              </div>
            </div>
            {reservation?.binds && (
              <div className="w-80 bg-white border mt-2 border-gray-600 rounded p-4  ">
                <div className="font-light mb-2 text-black text-xl">
                  Requested Binds
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {reservation?.binds.clients?.map((bind) => (
                    <div>{bind?.name}</div>
                  ))}
                  {reservation?.binds.templates?.map((bind) => (
                    <div>{bind?.interface}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        {reservation?.statusmessage}
        <div className="flex-initial mt-2">
          <div className="font-light mb-2 text-black text-xl dark:text-white">
            Linked Provisions
          </div>
          <div className="grid grid-cols-6 gap-2">
            {reservation?.provisions.map((provision) => (
              <ProvisionCard provision={provision} mates={[unlinkMate]} />
            ))}
          </div>
        </div>
        <div className="flex-initial mt-2">
          <div className="font-light mb-2 text-black text-xl dark:text-white">
            Linkable Provisions
          </div>
          <div className="grid grid-cols-6 gap-2">
            {provisions &&
              provisions.linkableprovisions
                ?.filter(notEmpty)
                .map((provision) => (
                  <ProvisionCard provision={provision} mates={[linkMate]} />
                ))}
          </div>
        </div>
        <div className="flex-grow"></div>
        <div className="flex-initial bg-gray-800 p-5 mb-3 rounded">
          <div className="font-light mb-2 text-white text-xl">Logs</div>
          {reservation?.log &&
            reservation?.log.map((log) => (
              <div className="cols-span-1  text-white">
                {log?.level === ReservationLogLevel.Info && (
                  <span className="text-green-300 font-semibold">INFO : </span>
                )}
                {log?.level === ReservationLogLevel.Debug && (
                  <span className="text-yellow-300 font-semibold">
                    DEBUG :{" "}
                  </span>
                )}
                {log?.level === ReservationLogLevel.Error && (
                  <span className="text-red-700 font-semibold">ERROR : </span>
                )}
                {log?.level === ReservationLogLevel.Critical && (
                  <span className="text-red-700 font-semibold">
                    CRITICAL :{" "}
                  </span>
                )}
                {log?.level === ReservationLogLevel.Warn && (
                  <span className="text-yellow-200 font-semibold">WARN : </span>
                )}
                {log?.message}
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};
