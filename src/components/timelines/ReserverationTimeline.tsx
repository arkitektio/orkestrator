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
          <div className="font-light mt-2 text-black text-xl dark:text-white">
            Parameters
          </div>
          <div className="w-80 bg-white border mt-2 border-gray-600 rounded p-4  ">
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
        </div>
        {reservation?.statusmessage}
        <div className="flex-initial mt-2">
          <div className="font-light mb-2 text-black text-xl dark:text-white">
            Linked Provisions
          </div>
          <div className="grid grid-cols-6 gap-2">
            {reservation?.provisions.map((provision) => (
              <Provision.Smart
                object={provision.id}
                className="border bg-white border-gray-600 rounded p-4 shadow-xl cursor-pointer relative"
              >
                {provision?.template?.registry?.user?.sub && (
                  <UserEmblem sub={provision?.template?.registry?.user?.sub} />
                )}
                <div className="flex w-full flex-row">
                  <ProvisionPulse status={provision.status} />
                  <Provision.DetailLink
                    className="flex-initial font-light cursor-pointer ml-2"
                    object={provision?.id}
                  >
                    {provision?.template?.registry?.app?.identifier}
                  </Provision.DetailLink>{" "}
                  <div className="flex-grow"></div>
                </div>
                <div className="mt-3 flex ">
                  <div className="flex-initial">
                    <button
                      className="ml-2 px-1 border border-gray-400 rounded-md"
                      onClick={() =>
                        unlink({
                          variables: {
                            provision: provision?.id,
                            reservation: reservation.id,
                          },
                        }).catch((e) => alert(e))
                      }
                    >
                      {" "}
                      Unlink
                    </button>
                  </div>
                  <div className="flex-grow"></div>
                  <div className="text-xs flex-initial"></div>
                </div>
              </Provision.Smart>
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
                  <Provision.Smart
                    object={provision.id}
                    className="border bg-white border-gray-600 rounded p-4 shadow-xl cursor-pointer relative"
                  >
                    {provision?.template?.registry?.user?.email && (
                      <UserEmblem
                        email={provision?.template?.registry?.user?.email}
                      />
                    )}
                    <div className="flex w-full flex-row">
                      <ProvisionPulse status={provision?.status} />
                      <Provision.DetailLink
                        className="flex-initial font-light cursor-pointer ml-2"
                        object={provision.id}
                      >
                        {provision?.template?.registry?.app?.identifier}:
                        {provision?.template?.registry?.app?.version}
                      </Provision.DetailLink>{" "}
                      <div className="flex-grow"></div>
                    </div>
                    <div className="mt-3 flex ">
                      <div className="flex-initial">
                        {provision?.id && (
                          <button
                            className="ml-2 px-1 border border-gray-400 rounded-md"
                            onClick={() =>
                              link({
                                variables: {
                                  provision: provision.id,
                                  reservation: reservation.id,
                                },
                              }).catch((e) => alert(e))
                            }
                          >
                            {" "}
                            Link
                          </button>
                        )}
                      </div>
                      <div className="flex-grow"></div>
                      <div className="text-xs flex-initial"></div>
                    </div>
                  </Provision.Smart>
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
