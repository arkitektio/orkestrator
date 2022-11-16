import React, { useState, useEffect } from "react";
import Timestamp from "react-timestamp";
import { toast } from "react-toastify";
import {
  MentionCommentFragment,
  useDetailCommentQuery,
  useMyMentionsQuery,
  WatchMentionsDocument,
  WatchMentionsSubscription,
  WatchMentionsSubscriptionVariables,
} from "../api/graphql";
import { Comment } from "../components/comments/CommentSection";
import { withMikro } from "../MikroContext";

export interface MentionListenerProps {}

export const MentionToast = (props: { mention: MentionCommentFragment }) => {
  return (
    <>
      <div className="flex flex-col">
        <div className="font-light mb-1">New Mention</div>
        {props.mention.contentType && props.mention.objectId && (
          <Comment
            comment={props.mention}
            model={props.mention.contentType}
            id={`${props.mention.objectId}`}
          />
        )}
        yar
      </div>
    </>
  );
};

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
          toast(<MentionToast mention={updated_ass} />);
        }

        if (action?.create) {
          let updated_ass = action.create;
          toast(<MentionToast mention={updated_ass} />);
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
