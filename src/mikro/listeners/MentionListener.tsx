import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import {
  useMyMentionsQuery,
  WatchMentionsDocument,
  WatchMentionsSubscription,
  WatchMentionsSubscriptionVariables,
} from "../api/graphql";
import { withMikro } from "../MikroContext";

export interface MentionListenerProps {}

export const MentionListener: React.FC<MentionListenerProps> = (props) => {
  const { data, subscribeToMore } = withMikro(useMyMentionsQuery)();

  useEffect(() => {
    console.log("Listerning for metnions");
    const unsubscribe = subscribeToMore<
      WatchMentionsSubscription,
      WatchMentionsSubscriptionVariables
    >({
      document: WatchMentionsDocument,
      updateQuery: (prev, { subscriptionData }) => {
        console.log("Received MyAssignationsEvent", subscriptionData);
        if (!subscriptionData.data) return prev;
        let action = subscriptionData.data?.mymentions;
        let newelements;
        // Try to update
        if (action?.update) {
          let updated_ass = action.update;
          toast(`${updated_ass.user.email} just mentioned you`);
        }

        if (action?.create) {
          let updated_ass = action.create;
          toast(`${updated_ass.user.email} just mentioned you`);
        }

        if (!newelements) return prev;

        return {
          ...prev,
        };
      },
    });
    return () => unsubscribe();
  }, [subscribeToMore]);

  return <></>;
};
