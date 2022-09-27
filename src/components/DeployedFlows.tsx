import React from "react";
import { useNavigate } from "react-router";
import { ReservationStatus } from "../arkitekt/api/graphql";
import { AdditionalMate, Mate } from "../arkitekt/postman/mater/mater-context";
import { useRequester } from "../arkitekt/postman/requester/requester-context";
import { useReserver } from "../arkitekt/postman/reserver/reserver-context";
import { notEmpty } from "../floating/utils";
import { SectionTitle } from "../layout/SectionTitle";
import { Reservation } from "../linker";
import { ResponsiveGrid } from "./layout/ResponsiveGrid";
import { colorFromReserveStatus } from "./Reservations";

export type IMyNodesProps = {};

const DeployedFlows: React.FC<IMyNodesProps> = ({}) => {
  const { reservations, reserve, unreserve } = useReserver();
  const { assign, unassign } = useRequester();

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
                `rounded border overflow-hidden shadow-md p-3 ${colorFromReserveStatus(
                  r?.status
                )} ${isOver && !isDragging && "border-primary-200 border"} ${
                  isDragging && "border-primary-200 border"
                } ${isSelected && "ring-1 ring-primary-200 "}`
              }
              additionalMates={(accept, isself) => {
                let mates: AdditionalMate[] = [];
                if (!isself) {
                  return mates;
                }

                if (r.status === ReservationStatus.Active) {
                  mates.push({
                    action: async () => {
                      await assign({ reservation: r });
                    },
                    label: "Assign",
                  });
                }

                return mates.concat([
                  {
                    action: async () => {
                      await unreserve({ reservation: r.id });
                    },
                    label: "Unreserve",
                  },
                ]);
              }}
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
                  Reserved by {r?.waiter?.registry?.app?.name}
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
