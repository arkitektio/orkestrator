import { useEffect } from "react";

import {
  type CallInviteFragment,
  type MyCallInvitesQuery,
  MyCallInvitesDocument,
  useDismissCallInviteMutation,
  useMyCallInvitesQuery,
  WatchCallInvitesDocument,
  type WatchCallInvitesSubscription,
  type WatchCallInvitesSubscriptionVariables,
} from "@/lovekit/api/graphql";

/**
 * The invitations ringing on this device: lovekit's answer to "who asked me
 * into a call", shared by the rail island and the Notifications widget
 * through the Apollo cache. `CallInvitesWatcher` keeps it live.
 */
export const useCallInvites = () => {
  const { data } = useMyCallInvitesQuery({ fetchPolicy: "cache-first" });
  return data?.myCallInvites ?? [];
};

/** Puts an invitation away, on every device of the invitee. */
export const useDismissInvite = () => {
  const [dismiss] = useDismissCallInviteMutation({
    update: (cache, result) => {
      const id = result.data?.dismissCallInvite;
      if (!id) return;
      cache.updateQuery<MyCallInvitesQuery>({ query: MyCallInvitesDocument }, (previous) =>
        previous ? { myCallInvites: previous.myCallInvites.filter((invite) => invite.id !== id) } : previous,
      );
    },
  });
  return (invite: Pick<CallInviteFragment, "id">) => dismiss({ variables: { input: { id: invite.id } } });
};

/**
 * Keeps the invitations current: asks once, subscribes for the ones that
 * arrive and go away while the app is open, and re-asks now and then so an
 * invitation to a call that has since ended stops ringing. A `background`
 * builtin, mounted on every device the user has the app open on.
 */
export const CallInvitesWatcher = () => {
  const { subscribeToMore } = useMyCallInvitesQuery({
    fetchPolicy: "cache-and-network",
    pollInterval: 30_000,
  });

  useEffect(
    () =>
      subscribeToMore<WatchCallInvitesSubscription, WatchCallInvitesSubscriptionVariables>({
        document: WatchCallInvitesDocument,
        updateQuery: (previous, { subscriptionData }) => {
          const event = subscriptionData.data?.callInvites;
          if (!event) return previous;
          const current = previous?.myCallInvites ?? [];
          if (event.delete) {
            return { myCallInvites: current.filter((invite) => invite.id !== event.delete) };
          }
          if (event.create && !current.some((invite) => invite.id === event.create?.id)) {
            return { myCallInvites: [event.create, ...current] };
          }
          return previous;
        },
      }),
    [subscribeToMore],
  );

  return null;
};
