import * as React from "react";
import { BsFolder2Open } from "react-icons/bs";
import { IoMdCheckmark } from "react-icons/io";
import { TfiMarkerAlt } from "react-icons/tfi";
import Timestamp from "react-timestamp";
import { notEmpty } from "../../floating/utils";
import { ActionButton } from "../../layout/ActionButton";
import { PageLayout } from "../../layout/PageLayout";
import { LokUser, getDefaultSmartModel } from "../../linker";
import { CreatePublicClientDialog } from "../../lok/components/dialogs/CreatePublicClient";
import { useDialog } from "../../providers/dialog/DialogProvider";

import { useDatalayer } from "@jhnnsrs/datalayer";
import { withLok } from "../LokContext";
import {
  MentionCommentFragment,
  useMyMentionsQuery,
  useResolveCommentMutation,
} from "../api/graphql";
import { CommentEdit } from "../komment/edit/CommentEdit";
import { Comment } from "../komment/display/Comment";

interface IFlowHomeProps {}

export const MentionedComment = ({
  comment,
}: {
  comment: MentionCommentFragment;
}) => {
  const [resolveComment] = withLok(useResolveCommentMutation)({
    update: (cache, { data }) => {
      if (data?.resolveComment) {
        cache.modify({
          id: cache.identify(data.resolveComment),
          fields: {
            resolved: () => data.resolveComment?.resolved,
            resolvedBy: () => data.resolveComment?.resolvedBy,
          },
        });
      }
    },
  });

  const { s3resolve } = useDatalayer();

  if (!comment.identifier) return <>No identifier found for</>;

  const Model = getDefaultSmartModel(comment.identifier);
  if (!Model) return <>No Smart Model found for {comment.identifier}</>;

  return (
    <div className="flex flex-col text-white">
      {comment?.user && (
        <div className="mt-2 flex flex-col w-full">
          <div className="flex flex-row-reverse">
            <div className="flex flex-initial my-auto">
              {comment.resolved ? (
                <div className="flex flex-row mr-2">
                  <div className="text-green-500">
                    <IoMdCheckmark />
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className="mr-2"
                  onClick={() => {
                    resolveComment({
                      variables: {
                        id: comment.id,
                      },
                    });
                  }}
                  title="Resolve Comment"
                >
                  {" "}
                  <TfiMarkerAlt />
                </button>
              )}
              <div className="text-gray-500 my-auto">
                <Model.DetailLink
                  object={comment.object}
                  className="text-slate-50 mt-5 "
                >
                  <BsFolder2Open />
                </Model.DetailLink>
              </div>
            </div>
          </div>
          <div className="flex-initial my-auto w-full">
            <Comment comment={comment} />
          </div>
        </div>
      )}
    </div>
  );
};

const TeamHome: React.FunctionComponent<IFlowHomeProps> = (props) => {
  const { data } = withLok(useMyMentionsQuery)();
  const { ask } = useDialog();
  return (
    <PageLayout
      actions={
        <>
          <ActionButton
            label="Create Public App"
            onAction={async () => {
              const x = await ask(CreatePublicClientDialog, {});
            }}
          />
        </>
      }
    >
      <div className="flex-initial flex flex-row mb-2">
        <div className="text-xl dark:text-white">My Mentions</div>
      </div>
      {data?.mymentions?.filter(notEmpty).map((x, index) => (
        <MentionedComment key={index} comment={x} />
      ))}
    </PageLayout>
  );
};

export default TeamHome;
