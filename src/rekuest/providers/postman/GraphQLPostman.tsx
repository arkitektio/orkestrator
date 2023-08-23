import { useEffect } from "react";
import { useSettings } from "../../../settings/settings-context";
import { useRekuest } from "../../RekuestContext";
import {
  AcknowledgeDocument,
  AcknowledgeMutation,
  AcknowledgeMutationVariables,
  AssignDocument,
  AssignMutation,
  AssignMutationVariables,
  PostmanAssignationFragment,
  PostmanAssignationFragmentDoc,
  PostmanReservationFragment,
  PostmanReservationFragmentDoc,
  ProvideDocument,
  ProvideMutation,
  ProvideMutationVariables,
  ReserveDocument,
  ReserveMutation,
  ReserveMutationVariables,
  UnassignDocument,
  UnassignMutation,
  UnassignMutationVariables,
  UnprovideMutation,
  UnprovideMutationVariables,
  UnreserveDocument,
  UnreserveMutation,
  UnreserveMutationVariables,
  WatchRequestsDocument,
  WatchRequestsSubscription,
  WatchRequestsSubscriptionVariables,
  WatchReservationsDocument,
  WatchReservationsSubscription,
  WatchReservationsSubscriptionVariables,
} from "../../api/graphql";
import {
  AckVariables,
  AssignVariables,
  ProvideVariables,
  ReserveVariables,
  UnassignVariables,
  UnprovideVariables,
  UnreserveVariables,
  usePostman,
} from "./postman-context";

export type PostmanProviderProps = {
  allowBatch?: boolean;
  onAssignUpdate?: (assign: PostmanAssignationFragment) => void;
  onReserveUpdate?: (reserve: PostmanReservationFragment) => void;
};

export const GraphQLPostman = (props: PostmanProviderProps) => {
  const { setPostman } = usePostman();
  const { client } = useRekuest();
  const { settings } = useSettings();

  useEffect(() => {
    if (client) {
      console.log("Subscribing to Postman Reservations");
      const subscription = client
        ?.subscribe<
          WatchReservationsSubscription,
          WatchReservationsSubscriptionVariables
        >({
          query: WatchReservationsDocument,
          variables: {
            instanceId: settings.instanceId,
          },
        })
        .subscribe((res) => {
          console.error("Received", res);

          let update =
            res.data?.reservations?.create || res.data?.reservations?.update;

          if (update) {
            props.onReserveUpdate && props.onReserveUpdate(update);
            client.cache.updateFragment(
              {
                id: `Reservation:${update.id}`,
                fragment: PostmanReservationFragmentDoc,
              },
              (data) => {
                console.log("Update Fragment", data);
                return {
                  ...data,
                  ...update,
                };
              }
            );
          }
        });

      return () => subscription.unsubscribe();
    }
  }, [client]);

  useEffect(() => {
    if (client) {
      console.log("Subscribing to Postman Assignation");
      const subscription = client
        ?.subscribe<
          WatchRequestsSubscription,
          WatchRequestsSubscriptionVariables
        >({
          query: WatchRequestsDocument,
          variables: {
            instanceId: settings.instanceId,
          },
        })
        .subscribe((res) => {
          console.log(res);

          let update = res.data?.requests?.create || res.data?.requests?.update;

          if (update) {
            props.onAssignUpdate && props.onAssignUpdate(update);
            client.cache.updateFragment(
              {
                id: `Assignation:${update.id}`,
                fragment: PostmanAssignationFragmentDoc,
              },
              (data) => {
                console.log("Update Fragment", data);
                return {
                  ...data,
                  ...update,
                };
              }
            );
          }
        });

      return () => subscription.unsubscribe();
    }
  }, [client]);

  useEffect(() => {
    if (client) {
      setPostman({
        assign: async (variables: AssignVariables) => {
          let x = await client.mutate<AssignMutation, AssignMutationVariables>({
            variables: variables,
            mutation: AssignDocument,
          });
          if (!x.data?.assign) throw new Error("No data received");
          return x.data.assign;
        },
        reserve: async (variables: ReserveVariables) => {
          let x = await client.mutate<
            ReserveMutation,
            ReserveMutationVariables
          >({
            variables: { ...variables, instanceId: settings.instanceId },
            mutation: ReserveDocument,
          });
          client.refetchQueries({
            include: ["Reservations"],
          });
          console.log("Reserve", x);
          if (!x.data?.reserve) throw new Error("No data received");
          return x.data.reserve;
        },
        unassign: async (variables: UnassignVariables) => {
          let x = await client.mutate<
            UnassignMutation,
            UnassignMutationVariables
          >({
            variables: variables,
            mutation: UnassignDocument,
          });
          if (!x.data?.unassign) throw new Error("No data received");
          return x.data.unassign;
        },
        unreserve: async (variables: UnreserveVariables) => {
          let x = await client.mutate<
            UnreserveMutation,
            UnreserveMutationVariables
          >({
            variables: variables,
            mutation: UnreserveDocument,
          });
          client.refetchQueries({
            include: ["Reservations"],
          });
          if (!x.data?.unreserve) throw new Error("No data received");
          return x.data.unreserve;
        },
        ack: async (variables: AckVariables) => {
          let x = await client.mutate<
            AcknowledgeMutation,
            AcknowledgeMutationVariables
          >({
            variables: variables,
            mutation: AcknowledgeDocument,
          });
          if (!x.data?.ack) throw new Error("No data received");
          return x.data.ack;
        },
        provide: async (variables: ProvideVariables) => {
          let x = await client.mutate<
            ProvideMutation,
            ProvideMutationVariables
          >({
            variables: variables,
            mutation: ProvideDocument,
          });
          if (!x.data?.provide) throw new Error("No data received");
          return x.data.provide;
        },
        unprovide: async (variables: UnprovideVariables) => {
          let x = await client.mutate<
            UnprovideMutation,
            UnprovideMutationVariables
          >({
            variables: variables,
            mutation: ProvideDocument,
          });
          if (!x.data?.unprovide) throw new Error("No data received");
          return x.data.unprovide;
        },
      });
    }
  }, [client]);

  return <> </>;
};
