import { Maybe } from "graphql/jsutils/Maybe";
import React, { useEffect } from "react";
import { useNavigate } from "react-router";
import Timestamp from "react-timestamp";
import { withRekuest } from "..";
import { FlussProvision } from "../../fluss/components/FlussProvision";
import { ActionButton } from "../../layout/ActionButton";
import { PageLayout } from "../../layout/PageLayout";
import { useConfirm } from "../../providers/confirmer/confirmer-context";
import {
  DetailProvisionFragment,
  DetailProvisionQuery,
  ProvisionLogLevel,
  useDetailProvisionQuery,
  useUnprovideMutation,
  WatchProvisionDocument,
  WatchProvisionSubscription,
  WatchProvisionSubscriptionVariables,
  WatchReservationsOnProvisionDocument,
  WatchReservationsOnProvisionSubscription,
  WatchReservationsOnProvisionSubscriptionVariables,
} from "../api/graphql";
import { ProvisionPulse } from "./generic/StatusPulse";
export type IProvisionScreenProps = {};
export type ProvisionToolBarProps = {
  provision: Maybe<DetailProvisionFragment>;
};

export const DetailProvision: React.FC<{ id: string }> = ({ id }) => {
  let { data, subscribeToMore } = withRekuest(useDetailProvisionQuery)({
    variables: { id },
  });

  const { confirm } = useConfirm();
  const navigate = useNavigate();

  const [unprovide] = withRekuest(useUnprovideMutation)();

  useEffect(() => {
    console.log("Subscribing to MyAssignations");
    const unsubscribe = subscribeToMore<
      WatchReservationsOnProvisionSubscription,
      WatchReservationsOnProvisionSubscriptionVariables
    >({
      document: WatchReservationsOnProvisionDocument,
      variables: { identifier: "default", provision: id },
      updateQuery: (prev, { subscriptionData }) => {
        console.log("Received MyAssignationsEvent", subscriptionData);
        if (!subscriptionData.data) return prev;
        let action = subscriptionData.data?.reservations;
        let newelements;
        // Try to update
        if (action?.update) {
          let updated_ass = action.update;

          newelements = prev.provision?.causedReservations?.map((item: any) =>
            item.id === updated_ass?.id ? { ...item, ...updated_ass } : item
          );
        }

        if (action?.create) {
          let updated_ass = action.create;
          newelements = prev.provision?.causedReservations?.concat(updated_ass);
        }

        if (!newelements) return prev;

        return {
          ...prev,
          requests: [...newelements],
        };
      },
    });
    return () => unsubscribe();
  }, [subscribeToMore]);

  useEffect(() => {
    const unsubscribe = subscribeToMore<
      WatchProvisionSubscription,
      WatchProvisionSubscriptionVariables
    >({
      document: WatchProvisionDocument,
      variables: { id: id },
      updateQuery: (prev, { subscriptionData }) => {
        let event = subscriptionData.data?.provision;

        console.log("Received ProvisionEvent", event);

        if (event?.log) {
          let newLog = { ...event.log, __typename: "ProvisionLog" };
          return {
            ...prev,
            provision: {
              ...prev.provision,
              log: [...(prev.provision?.log as []), newLog],
            },
          } as DetailProvisionQuery;
        }

        return prev;
      },
    });
    return () => unsubscribe();
  }, [id, subscribeToMore]);

  if (data?.provision?.template?.node?.interfaces?.includes("workflow")) {
    return <FlussProvision provision={data.provision} />;
  }

  return (
    <PageLayout
      actions={
        <ActionButton
          label="Unprovide"
          onAction={async () => {
            console.log("Unproviding");
            await confirm({
              message: "Are you sure you want to unprovide this provision?",
            });
            await unprovide({ variables: { id } });
            await navigate(-1);
          }}
        />
      }
    >
      <div className="flex flex-col h-full">
        {data?.provision?.status}
        <div className="flex-initial flex flex-row dark:text-white">
          <ProvisionPulse status={data?.provision?.status} />
          <span className="ml-3">
            Provision for {data?.provision?.template?.node?.name}
          </span>
          {data?.provision?.statusmessage}
        </div>
        <div className="flex-initial max-w-md">
          <div className="flex flex-col bg-gray-700 text-white rounded p-5 mt-2">
            {data?.provision?.log?.map((log) => (
              <div className="flex-initial flex flex-row text-white">
                {log?.level === ProvisionLogLevel.Info && (
                  <span className="text-green-300 font-semibold">INFO : </span>
                )}
                {log?.level === ProvisionLogLevel.Debug && (
                  <span className="text-yellow-300 font-semibold">
                    DEBUG :{" "}
                  </span>
                )}
                {log?.level === ProvisionLogLevel.Warn && (
                  <span className="text-yellow-200 font-semibold">WARN : </span>
                )}
                <span className="flex-grow">{log?.message}</span>
                <span className="flex-initial">
                  <Timestamp date={log?.createdAt} />
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageLayout>
  );
};
