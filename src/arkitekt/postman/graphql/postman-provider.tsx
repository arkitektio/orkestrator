import React, { useEffect } from "react";
import { toast } from "react-toastify";
import { useAlert } from "../../../components/alerter/alerter-context";
import { useFakts } from "../../../fakts";
import {
  AgentsEventDocument,
  AgentsEventSubscriptionResult,
  AgentsQuery,
  AgentStatusInput,
  AssignationStatus,
  useAcknowledgeMutation,
  useAgentsQuery,
  useAssignMutation,
  useDetailNodeQuery,
  useProvideMutation,
  useProvisionsQuery,
  useRequestsQuery,
  useReservationsQuery,
  useReserveMutation,
  useUnassignMutation,
  useUnprovideMutation,
  useUnreserveMutation,
  WatchProvisionsDocument,
  WatchProvisionsSubscription,
  WatchProvisionsSubscriptionVariables,
  WatchRequestsDocument,
  WatchRequestsSubscription,
  WatchReservationsDocument,
  WatchReservationsSubscription,
  WatchReservationsSubscriptionVariables,
} from "../../api/graphql";
import { withArkitekt } from "../../arkitekt";
import { ReturnWidgetsContainer } from "../../widgets/containers/ReturnWidgetsContainer";
import { PostmanContext } from "./postman-context";
export type PostmanProviderProps = {
  allowBatch?: boolean;
  children: React.ReactNode;
};
const Internal = (props: any) => {
  const { data } = withArkitekt(useDetailNodeQuery)({
    variables: { id: props.ass.reservation.node.id as string },
  });

  return data?.node && props.ass.returns ? (
    <ReturnWidgetsContainer node={data.node} returns={props.ass.returns} />
  ) : (
    <>Assignation finished</>
  );
};

const Msg =
  (ass: any) =>
  ({ closeToast, toastProps }: any) => {
    return (
      <div>
        <Internal ass={ass} />
      </div>
    );
  };

export const PostmanProvider: React.FC<PostmanProviderProps> = ({
  children,
  allowBatch = true,
}) => {
  const { data: reservations, subscribeToMore: subscribeToMoreReservations } =
    withArkitekt(useReservationsQuery)({
      variables: {},
    });
  const { data: requests, subscribeToMore: subscribeToMoreRequests } =
    withArkitekt(useRequestsQuery)({
      variables: {},
    });

  const { data: provisions, subscribeToMore: subscribteToMoreProvisions } =
    withArkitekt(useProvisionsQuery)({
      variables: {},
    });

  const { data: agents, subscribeToMore: subscribeToMoreAgents } = withArkitekt(
    useAgentsQuery
  )({
    variables: {
      status: [AgentStatusInput.Active],
    },
  });

  const { fakts } = useFakts();

  const [reserve] = withArkitekt(useReserveMutation)();
  const [ack] = withArkitekt(useAcknowledgeMutation)();
  const [provide] = withArkitekt(useProvideMutation)();
  const [unprovide] = withArkitekt(useUnprovideMutation)();
  const [unreserve] = withArkitekt(useUnreserveMutation)();
  const [assign] = withArkitekt(useAssignMutation)();
  const [unassign] = withArkitekt(useUnassignMutation)();
  const { alert } = useAlert();

  useEffect(() => {
    console.log("Subscribing to Postman Reservations");
    const unsubscribe = subscribeToMoreReservations<
      WatchReservationsSubscription,
      WatchReservationsSubscriptionVariables
    >({
      document: WatchReservationsDocument,
      variables: {
        identifier: "default",
      },
      updateQuery: (prev, { subscriptionData }) => {
        console.log("Received MyReservationsEvent", subscriptionData);
        let action = subscriptionData.data?.reservations;
        let newelements;
        // Try to update
        if (action?.update) {
          let updated_res = action.update;
          if (prev.reservations?.find((res) => res?.id == updated_res.id)) {
            newelements = prev.reservations?.map((item: any) =>
              item.id === updated_res?.id ? { ...item, ...updated_res } : item
            );
          } else {
            newelements = prev.reservations?.concat(updated_res);
          }
        }

        if (action?.delete) {
          let ended_res = action.delete;
          newelements = prev.reservations
            ?.map((item: any) => (item.id === ended_res ? null : item))
            .filter((item) => item != null);
        }

        if (action?.create) {
          let updated_res = action.create;
          newelements = prev.reservations?.concat(updated_res);
        }

        if (!newelements) return prev;

        console.log("Received ", subscriptionData);
        return {
          ...prev,
          reservations: [...newelements],
        };
      },
    });
    return () => unsubscribe();
  }, [subscribeToMoreReservations]);

  useEffect(() => {
    console.log("Subscribing to MyProvisions");
    const unsubscribe = subscribteToMoreProvisions<
      WatchProvisionsSubscription,
      WatchProvisionsSubscriptionVariables
    >({
      document: WatchProvisionsDocument,
      variables: {
        identifier: "default",
      },
      updateQuery: (prev, { subscriptionData }) => {
        console.log("Received MyProvisionsEvent", subscriptionData);
        let action = subscriptionData.data?.provisions;
        let newelements;
        // Try to update
        if (action?.update) {
          let updated_res = action.update;
          if (prev.provisions?.find((res) => res?.id == updated_res.id)) {
            newelements = prev.provisions?.map((item: any) =>
              item.id === updated_res?.id ? { ...item, ...updated_res } : item
            );
          } else {
            newelements = prev.provisions?.concat(updated_res);
          }
        }

        if (action?.delete) {
          let ended_res = action.delete;
          newelements = prev.provisions
            ?.map((item: any) => (item.id === ended_res ? null : item))
            .filter((item) => item != null);
        }

        if (action?.create) {
          let updated_res = action.create;
          newelements = prev.provisions?.concat(updated_res);
        }

        if (!newelements) return prev;
        console.log("Received ", subscriptionData);
        return {
          ...prev,
          provisions: [...newelements],
        };
      },
    });
    return () => unsubscribe();
  }, [subscribteToMoreProvisions]);

  useEffect(() => {
    console.log("Subscribing to MyAssignations");
    const unsubscribe = subscribeToMoreRequests<
      WatchRequestsSubscription,
      WatchReservationsSubscriptionVariables
    >({
      document: WatchRequestsDocument,
      variables: { identifier: "default" },
      updateQuery: (prev, { subscriptionData }) => {
        console.log("Received MyAssignationsEvent", subscriptionData);
        if (!subscriptionData.data) return prev;
        let action = subscriptionData.data?.requests;
        let newelements;
        // Try to update
        if (action?.update) {
          let updated_ass = action.update;

          switch (updated_ass.status) {
            case AssignationStatus.Yield:
            case AssignationStatus.Returned: {
              toast(Msg(updated_ass));
              break;
            }
            case AssignationStatus.Error:
            case AssignationStatus.Critical: {
              toast.error("Error: " + updated_ass.statusmessage);
            }
          }

          newelements = prev.requests?.map((item: any) =>
            item.id === updated_ass?.id ? { ...item, ...updated_ass } : item
          );
        }

        if (action?.create) {
          let updated_ass = action.create;
          newelements = prev.requests?.concat(updated_ass);
        }

        if (!newelements) return prev;

        return {
          ...prev,
          requests: [...newelements],
        };
      },
    });
    return () => unsubscribe();
  }, [subscribeToMoreRequests]);

  useEffect(() => {
    console.log("Subscribings to AgentsEvent");
    const unsubscribe = subscribeToMoreAgents({
      document: AgentsEventDocument,
      variables: {},
      updateQuery: (prev, { subscriptionData }) => {
        console.log("Received AgentsEvent", subscriptionData);
        var data = subscriptionData as AgentsEventSubscriptionResult;
        let action = data.data?.agentsEvent;
        let newelements;

        if (action?.deleted) {
          let ended_ass = action.deleted;
          newelements = prev.agents
            ?.map((item: any) => (item.id === ended_ass ? null : item))
            .filter((item) => item != null);
        }

        if (action?.updated) {
          let updated_ass = action.updated;
          let objIndex = prev.agents?.findIndex(
            (obj) => obj?.id == updated_ass.id
          );
          if (objIndex == -1) {
            newelements = prev.agents?.concat(updated_ass);
          } else {
            newelements = prev.agents
              ?.map((item: any) =>
                item.id === updated_ass ? updated_ass : item
              )
              .filter((item) => item != null);
          }
        }

        console.log(newelements);
        console.log("Received ", subscriptionData);
        return { ...prev, agents: newelements } as AgentsQuery;
      },
    });
    return () => unsubscribe();
  }, [subscribeToMoreAgents]);

  return (
    <PostmanContext.Provider
      value={{
        reservations: reservations,
        requests: requests,
        provisions: provisions,
        agents: agents,
        ack: ack,
        provide: provide,
        unprovide: unprovide,
        reserve: reserve,
        unreserve: unreserve,
        assign: assign,
        unassign: unassign,
      }}
    >
      {children}
    </PostmanContext.Provider>
  );
};
