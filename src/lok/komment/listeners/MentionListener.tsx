import React, { useEffect } from "react";
import { toast } from "react-toastify";
import { getDefaultSmartModel } from "../../../linker";
import { withLok } from "../../LokContext";
import {
  MentionCommentFragment,
  WatchMentionsDocument,
  WatchMentionsSubscription,
  WatchMentionsSubscriptionVariables,
  useMyMentionsQuery,
} from "../../api/graphql";
import { Comment } from "../display/Comment";

export interface MentionListenerProps {}

export const MentionToast = (props: { mention: MentionCommentFragment }) => {
  if (!props.mention.identifier) return <></>;
  const Model = getDefaultSmartModel(props.mention.identifier);
  if (!Model) return <>No model found for this {props.mention.identifier}</>;

  return (
    <>
      <div className="flex flex-col">
        <Model.DetailLink
          object={props.mention.object as string}
          className="font-light mb-1"
        >
          New Mention
          <Comment comment={props.mention} />
        </Model.DetailLink>
      </div>
    </>
  );
};

export const MentionListener: React.FC<MentionListenerProps> = (props) => {
  const { data, subscribeToMore } = withLok(useMyMentionsQuery)();

  useEffect(() => {
    console.log("Listerning for Mentions");
    const unsubscribe = subscribeToMore<
      WatchMentionsSubscription,
      WatchMentionsSubscriptionVariables
    >({
      document: WatchMentionsDocument,
      updateQuery: (prev, { subscriptionData }) => {
        console.log("Received Mentionsevent", subscriptionData);
        if (!subscriptionData.data) return prev;
        let action = subscriptionData.data?.mymentions;
        let newelements;
        // Try to update
        if (action?.update) {
          let updated_ass = action.update;
          toast(<MentionToast mention={updated_ass} />, {
            closeOnClick: false,
          });
        }

        if (action?.create) {
          let updated_ass = action.create;
          toast(<MentionToast mention={updated_ass} />, {
            closeOnClick: false,
          });
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
