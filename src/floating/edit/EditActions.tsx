import React, { useEffect } from "react";
import { useNavigate } from "react-router";
import {
  AssignationStatus,
  ReservationStatus,
  useNodesQuery,
  WatchInterfaceSubscription,
  WatchInterfaceSubscriptionVariables,
  WatchInterfaceDocument,
} from "../../rekuest/api/graphql";
import { usePostman } from "../../rekuest/postman/graphql/postman-context";
import { useRequester } from "../../rekuest/postman/requester/requester-context";
import { useReserver } from "../../rekuest/postman/reserver/reserver-context";
import { FlowFragment } from "../../fluss/api/graphql";
import { ActionButton } from "../../layout/ActionButton";
import { Node } from "../../linker";
import { useEditRiver } from "./context";
import { withRekuest } from "../../rekuest";

export interface EditActionsProps {
  flow: FlowFragment;
}

export const EditActions: React.FC<EditActionsProps> = (props) => {
  const { saveDiagram, flow, addArkitekt, saving, setLayout } = useEditRiver();
  const { assign } = useRequester();
  const { reservations, reserve } = useReserver();
  const navigate = useNavigate();

  const { data: deployable, subscribeToMore } = withRekuest(useNodesQuery)({
    variables: { interfaces: [`flow:${flow?.id}`] },
  });

  useEffect(() => {
    console.log("Subscribing to My Representations");
    const unsubscribe = subscribeToMore<
      WatchInterfaceSubscription,
      WatchInterfaceSubscriptionVariables
    >({
      document: WatchInterfaceDocument,
      variables: {},
      updateQuery: (prev, { subscriptionData }) => {
        console.log("Received Representation", subscriptionData);
        let action = subscriptionData.data?.nodes;
        let newelements;
        // Try to update
        if (action?.updated) {
          let updated_res = action.updated;
          newelements = prev.allnodes?.map((item: any) =>
            item.id === updated_res?.id
              ? { ...item, data: { ...item.data, ...updated_res } }
              : item
          );
        }

        if (action?.deleted) {
          let ended_res = action.deleted;
          newelements = prev.allnodes
            ?.map((item: any) => (item.id === ended_res ? null : item))
            .filter((item) => item != null);
        }

        if (action?.created) {
          let updated_res = action.created;
          if (prev.allnodes) {
            newelements = [updated_res, ...prev.allnodes];
          } else {
            newelements = [updated_res];
          }
        }

        console.log("Received ", subscriptionData);
        return {
          ...prev,
          allnodes: newelements,
        };
      },
    });
    return () => unsubscribe();
  }, [subscribeToMore]);

  const reserved = reservations?.reservations
    ?.filter((res) => res?.node?.interfaces?.includes(`flow:${flow?.id}`))
    .at(0);

  const deployed = deployable?.allnodes?.at(0);

  const deployRes = reservations?.reservations
    ?.filter((res) => res?.node?.interfaces?.includes("fluss::deploy"))
    ?.filter((res) => res?.status == ReservationStatus.Active)
    .at(0);

  const undeployRes = reservations?.reservations
    ?.filter((res) => res?.node?.interfaces?.includes("fluss::undeploy"))
    .at(0);

  return (
    <>
      <ActionButton
        label="Save"
        description="Save this flow"
        onAction={async () => {
          await saveDiagram();
        }}
      />
      <ActionButton
        label="Layout"
        description="Auto Layout this flow"
        onAction={async () => {
          setLayout("LR");
        }}
      />
      {!deployed && (
        <ActionButton
          label={!deployed ? "Deploy" : "Redeploy"}
          inactive={!deployRes}
          description="Deploy this flow"
          onAction={async () => {
            if (deployRes) {
              assign({
                reservation: deployRes,
                defaults: { flow: flow?.id },
              });
            }
          }}
        />
      )}
      {deployed && (
        <ActionButton
          label={"Open"}
          description="Undeploy this flow"
          onAction={async () => {
            navigate(Node.linkBuilder(deployed.id));
          }}
        />
      )}
    </>
  );
};
