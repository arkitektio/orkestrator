import * as React from "react";
import { UserEmblem } from "../../man/components/UserEmblem";
import {
  CommentableModels,
  MentionCommentFragment,
  useMyMentionsQuery,
} from "../../mikro/api/graphql";
import { withMikro } from "../../mikro/MikroContext";
import Timestamp from "react-timestamp";
import { CommentView } from "../../mikro/components/comments/CommentView";
import { PageLayout } from "../../layout/PageLayout";
import { NavLink } from "react-router-dom";
import {
  getDefaultSmartModel,
  getIdentifierForCommentableModel,
} from "../../linker";
import { notEmpty } from "../../floating/utils";
import { MyPublicFakts } from "../../man/components/MyPublicFakts";
import { MyPrivateFakts } from "../../man/components/MyPrivateFakts";
import { ActionButton } from "../../layout/ActionButton";
import { useDialog } from "../../layout/dialog/DialogProvider";
import { CreatePublicFaktDialgog } from "../../man/components/dialogs/CreatePublicFaktDialog";

interface IFlowHomeProps {}

const modelToPath = (
  model: CommentableModels | null | undefined,
  object: string | number
) => {
  switch (model) {
    case CommentableModels.GrunnlagSample:
      return `/data/samples/${object}`;
    case CommentableModels.GrunnlagRepresentation:
      return `/data/representations/${object}`;
    case CommentableModels.GrunnlagRoi:
      return `/data/rois/${object}`;
    case CommentableModels.BordTable:
      return `/data/tables/${object}`;
    case CommentableModels.GrunnlagExperiment:
      return `/data/experiments/${object}`;
    default:
      return `/`;
  }
};

export const MentionedComment = ({
  comment,
}: {
  comment: MentionCommentFragment;
}) => {
  if (!comment.contentType) return <>Cannot</>;
  const identifier = getIdentifierForCommentableModel(comment.contentType);
  if (!identifier) return <>No identifier found for {comment.contentType}</>;

  const Model = getDefaultSmartModel(identifier);
  if (!Model) return <>No Smart Model found for {identifier}</>;

  return (
    <div className="flex flex-col">
      {comment?.user && (
        <div className="mt-2">
          <Model.DetailLink
            object={comment.objectId.toString()}
            className="text-slate-50 mt-5 "
          >
            {comment?.user.email} mentioned you{" "}
            {comment.mentions.length > 1 &&
              "and other " + comment.mentions.length + " people"}{" "}
            <Timestamp relative date={comment?.createdAt} />
            <CommentView
              descendents={comment.descendents}
              className="mt-2  text-sm bg-slate-300 p-3 border rounded text-black"
            />
          </Model.DetailLink>
        </div>
      )}
    </div>
  );
};

const TeamHome: React.FunctionComponent<IFlowHomeProps> = (props) => {
  const { data } = withMikro(useMyMentionsQuery)();
  const { ask } = useDialog();
  return (
    <PageLayout
      actions={
        <>
          <ActionButton
            label="Create Public App"
            onAction={async () => {
              const x = await ask(CreatePublicFaktDialgog, {});
            }}
          />
        </>
      }
    >
      <div className="flex-initial flex flex-row mb-2">
        <div className="text-xl dark:text-white">My Feed</div>
      </div>
      {data?.mymentions?.filter(notEmpty).map((x, index) => (
        <MentionedComment key={index} comment={x} />
      ))}
      <MyPublicFakts />
      <MyPrivateFakts />
    </PageLayout>
  );
};

export default TeamHome;
