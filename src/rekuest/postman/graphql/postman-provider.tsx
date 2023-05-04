import React, { useEffect } from "react";
import { toast } from "react-toastify";
import { useAlert } from "../../../components/alerter/alerter-context";
import { notEmpty } from "../../../floating/utils";
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
import { withRekuest } from "../../RekuestContext";
import { RekuestGuard } from "../../RekuestGuard";
import { WidgetsContainer } from "../../widgets/containers/ReturnWidgetsContainer";
import { PostmanContext } from "./postman-context";
export type PostmanProviderProps = {
  allowBatch?: boolean;
  children: React.ReactNode;
};
const Internal = (props: any) => {
  const { data } = withRekuest(useDetailNodeQuery)({
    variables: { id: props.ass.reservation.node.id as string },
  });

  return data?.node?.returns && props.ass.returns ? (
    <WidgetsContainer
      ports={data.node.returns.filter(notEmpty)}
      values={props.ass.returns}
    />
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

export const TruePostmanProvider: React.FC<PostmanProviderProps> = ({
  children,
  allowBatch = true,
}) => {
  const { data: reservations, subscribeToMore: subscribeToMoreReservations } =
    withRekuest(useReservationsQuery)({
      variables: {},
    });
  const { data: requests, subscribeToMore: subscribeToMoreRequests } =
    withRekuest(useRequestsQuery)({
      variables: {},
    });

  const { data: provisions, subscribeToMore: subscribteToMoreProvisions } =
    withRekuest(useProvisionsQuery)({
      variables: {},
    });

  const { data: agents, subscribeToMore: subscribeToMoreAgents } = withRekuest(
    useAgentsQuery
  )({
    variables: {
      status: [AgentStatusInput.Active],
    },
  });

  const [reserve] = withRekuest(useReserveMutation)();
  const [ack] = withRekuest(useAcknowledgeMutation)();
  const [provide] = withRekuest(useProvideMutation)();
  const [unprovide] = withRekuest(useUnprovideMutation)();
  const [unreserve] = withRekuest(useUnreserveMutation)();
  const [assign] = withRekuest(useAssignMutation)();
  const [unassign] = withRekuest(useUnassignMutation)();
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
            case AssignationStatus.Done: {
              toast("Done");
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

const NoPostmanProvider = ({ children }: { children: React.ReactNode }) => {
  const failureFunc = async (...args: any[]): Promise<any> => {
    console.log("No Postman Provider", args);
    throw Error("No Postman Provider");
  };

  return (
    <PostmanContext.Provider
      value={{
        reservations: undefined,
        requests: undefined,
        provisions: undefined,
        agents: undefined,
        ack: failureFunc,
        provide: failureFunc,
        unprovide: failureFunc,
        reserve: failureFunc,
        unreserve: failureFunc,
        assign: failureFunc,
        unassign: failureFunc,
      }}
    >
      {children}
    </PostmanContext.Provider>
  );
};

export const PostmanProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return (
    <RekuestGuard fallback={<NoPostmanProvider>{children}</NoPostmanProvider>}>
      <TruePostmanProvider>{children}</TruePostmanProvider>
    </RekuestGuard>
  );
};

export default PostmanProvider;
