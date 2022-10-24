import React, { useState, useEffect } from "react";
import { useParams } from "react-router";
import { useDetailAgentQuery } from "../../../rekuest/api/graphql";
import { ProvisionPulse } from "../../../rekuest/components/generic/StatusPulse";
import { SmartModel } from "../../../rekuest/selection/SmartModel";
import { ResponsiveGrid } from "../../../components/layout/ResponsiveGrid";
import { notEmpty } from "../../../floating/utils";
import { PageLayout } from "../../../layout/PageLayout";
import { Provision, Reservation } from "../../../linker";
import { withRekuest } from "../../../rekuest";

export interface DashboardAgentProps {}

export const DashboardAgent: React.FC<DashboardAgentProps> = (props) => {
  const { id } = useParams<{ id: string }>();
  if (!id) return <>ssss</>;

  const { data } = withRekuest(useDetailAgentQuery)({
    variables: { id },
  });

  return (
    <PageLayout>
      <div className="text-white">
        {data?.agent?.name}
        <ResponsiveGrid>
          {data?.agent?.provisions?.filter(notEmpty).map((p) => (
            <Provision.Smart
              object={p.id}
              dragClassName={({ isOver, canDrop, isSelected, isDragging }) =>
                `rounded border overflow-hidden shadow-md p-3 text-white ${
                  isOver && !isDragging && "border-primary-200 border"
                } ${isDragging && "border-primary-200 border"} ${
                  isSelected && "ring-1 ring-primary-200 "
                }`
              }
            >
              <>
                <div className="text-white text-xl p-2 flex flex-row">
                  <ProvisionPulse status={p.status} />
                  <span className="ml-3">{p?.template?.node?.name}</span>
                </div>
                <div className="flex-grow"></div>
                <div className="flex-initial">Reserved by </div>
                <div className="flex-initial">
                  {p.reservations.filter(notEmpty).map((r) => (
                    <Reservation.Smart
                      object={r.id}
                      placement="bottom"
                      dragClassName={({
                        isOver,
                        canDrop,
                        isSelected,
                        isDragging,
                      }) =>
                        `rounded border overflow-hidden shadow-md p-3 text-white ${
                          isOver && !isDragging && "border-primary-200 border"
                        } ${isDragging && "border-primary-200 border"} ${
                          isSelected && "ring-1 ring-primary-200 "
                        }`
                      }
                    >
                      {p.id}
                    </Reservation.Smart>
                  ))}
                </div>
              </>
            </Provision.Smart>
          ))}
        </ResponsiveGrid>
      </div>
    </PageLayout>
  );
};
