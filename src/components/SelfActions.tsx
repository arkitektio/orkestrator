import React, { useState, useEffect } from "react";
import { ReservationStatus } from "../rekuest/api/graphql";
import { usePostman } from "../rekuest/postman/graphql/postman-context";
import { useRequester } from "../rekuest/postman/requester/requester-context";
import { useReserver } from "../rekuest/postman/reserver/reserver-context";
import { notEmpty } from "../floating/utils";
import { ActionButton } from "../layout/ActionButton";

export interface SelfActionsProps {
  type: `${string}/${string}`;
  object: string;
  limit?: number;
  buttonClassName?: string;
}

export const SelfActions: React.FC<SelfActionsProps> = ({
  type,
  object,
  limit,
  buttonClassName,
}) => {
  const { reservations } = useReserver();
  const { assign } = useRequester();

  let available_res = reservations?.reservations
    ?.filter((res) => res?.node?.args?.at(0)?.identifier == type)
    .filter(notEmpty)
    .sort((a, b) => (a.status == ReservationStatus.Active ? -1 : 1));

  available_res = available_res?.slice(0, limit || available_res?.length);

  return (
    <>
      {available_res?.map((res) => (
        <ActionButton
          label={res.title || res.node?.name || "Unknown"}
          description={res.node.kind || "No description"}
          className={buttonClassName}
          inactive={res.status != ReservationStatus.Active}
          onAction={async () => {
            let selfkey = res?.node?.args?.at(0)?.key;
            if (selfkey) {
              assign({ reservation: res, defaults: { [selfkey]: object } });
            }
          }}
        />
      ))}
    </>
  );
};
