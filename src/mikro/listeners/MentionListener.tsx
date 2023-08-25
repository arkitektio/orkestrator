import React, { useEffect } from "react";
import { toast } from "react-toastify";
import {
  getDefaultSmartModel,
  getIdentifierForCommentableModel,
} from "../../../linker";
import { withMikro } from "../../../mikro/MikroContext";
import {
  MentionCommentFragment,
  WatchMentionsDocument,
  WatchMentionsSubscription,
  WatchMentionsSubscriptionVariables,
  useMyMentionsQuery,
} from "../../../mikro/api/graphql";

export interface MentionListenerProps {}

export const MentionToast = (props: { mention: MentionCommentFragment }) => {
  if (!props.mention.contentType) return <></>;
  const identifier = getIdentifierForCommentableModel(
    props.mention.contentType
  );
  if (!identifier)
    return <>No identifier found for this {props.mention.contentType}</>;
  const Model = getDefaultSmartModel(identifier);
  if (!Model) return <>No model found for this {identifier}</>;

  return (
    <>
      <div className="flex flex-col">
        <Model.DetailLink
          object={props.mention.objectId as string}
          className="font-light mb-1"
        >
          New Mention
          {props.mention.contentType && props.mention.objectId && (
            <Comment comment={props.mention} />
          )}
        </Model.DetailLink>
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
