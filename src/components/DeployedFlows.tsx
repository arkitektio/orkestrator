import React from "react";
import { useNavigate } from "react-router";
import { notEmpty } from "../floating/utils";
import { SectionTitle } from "../layout/SectionTitle";
import { Reservation } from "../linker";
import { useRequesterMate } from "../mates/reservation/useRequesterMate";
import { ReservationStatus } from "../rekuest/api/graphql";
import { useReserver } from "../rekuest/postman/reserver/reserver-context";
import { colorFromReservationStatus } from "../rekuest/utils";
import { ResponsiveGrid } from "./layout/ResponsiveGrid";

export type IMyNodesProps = {};

const DeployedFlows: React.FC<IMyNodesProps> = ({}) => {
  const { reservations, reserve, unreserve } = useReserver();

  const requesterMate = useRequesterMate();

  const navigate = useNavigate();

  return (
    <div>
      <SectionTitle>Deployed Flows</SectionTitle>
      <br />
      <ResponsiveGrid>
        {reservations?.reservations
          ?.filter((res) => res?.node?.interfaces?.includes("workflow"))
          ?.filter(notEmpty)
          .map((r, index) => (
            <Reservation.Smart
              showSelfMates={true}
              placement="bottom"
              object={r.id}
              dragClassName={({ isOver, canDrop, isSelected, isDragging }) =>
                `rounded border overflow-hidden shadow-md p-3 ${colorFromReservationStatus(
                  r?.status
                )} ${isOver && !isDragging && "border-primary-200 border"} ${
                  isDragging && "border-primary-200 border"
                } ${isSelected && "ring-1 ring-primary-200 "}`
              }
              mates={[requesterMate(r)]}
            >
              <Reservation.DetailLink
                className={({ isActive }) =>
                  "cursor-pointer " + (isActive ? "text-primary-300" : "")
                }
                object={r?.id}
              >
                <span className="truncate">{r?.title || r.node?.name}</span>
              </Reservation.DetailLink>
              {r?.title && (
                <p className="font-semibold text-xs">{r?.node?.name}</p>
              )}
              {r?.waiter?.registry && (
                <p className=" font-semibold text-xs">
                  Reserved by {r?.waiter?.registry?.app?.identifier}:
                  {r?.waiter?.registry?.app?.version}
                </p>
              )}
              {r?.status == ReservationStatus.Waiting && (
                <div className="text-xs">
                  Waiting for the Provider to become active...
                </div>
              )}
              {r?.status == ReservationStatus.Rerouting && (
                <div className="text-xs">Reservation requires rerouting...</div>
              )}
            </Reservation.Smart>
          ))}
      </ResponsiveGrid>
    </div>
  );
};

export { DeployedFlows };
