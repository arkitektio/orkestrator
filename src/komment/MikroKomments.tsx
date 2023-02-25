import React from "react";
import { notEmpty } from "../floating/utils";
import {
  CommentsForDocument,
  CommentsForQuery,
  useCommentsForQuery,
  useCreateCommentMutation,
  CommentableModels,
  useReplyToMutation,
} from "../mikro/api/graphql";
import { withMikro } from "../mikro/MikroContext";
import { CommentList } from "./display/CommentList";
import { CommentEdit } from "./edit/CommentEdit";
import { KommentProps } from "./types";

export type MikroKommentsProps = KommentProps<CommentableModels>;

export const MikroKomments = ({ id, model }: MikroKommentsProps) => {
  const { data } = withMikro(useCommentsForQuery)({ variables: { id, model } });

  const [replyTo] = withMikro(useReplyToMutation)({
    update(cache, result) {
      cache.updateQuery<CommentsForQuery>(
        {
          query: CommentsForDocument,
          variables: {
            id: id,
            model: model,
          },
        },
        (data) => {
          console.log(data, result);
          if (result.data?.replyTo?.parent?.id) {
            return {
              ...data,
              commentsfor:
                result.data?.replyTo && data?.commentsfor
                  ? data?.commentsfor.map((t) =>
                      t?.children && t?.id === result.data?.replyTo?.parent?.id
                        ? {
                            ...t,
                            children: [result.data.replyTo, ...t?.children],
                          }
                        : t
                    )
                  : data?.commentsfor,
            };
          }

          return data;
        }
      );
    },
  });

  const [createComment] = withMikro(useCreateCommentMutation)({
    update(cache, result) {
      cache.updateQuery<CommentsForQuery>(
        {
          query: CommentsForDocument,
          variables: {
            id: id,
            model: model,
          },
        },
        (data) => {
          return {
            ...data,
            commentsfor:
              result.data?.createComment && data?.commentsfor
                ? [result.data.createComment, ...data?.commentsfor]
                : data?.commentsfor,
          };
        }
      );
    },
  });

  return (
    <div className="flex flex-col ">
      <CommentEdit id={id} model={model} createComment={createComment} />
      {data?.commentsfor && (
        <CommentList
          comments={data?.commentsfor.filter(notEmpty)}
          replyTo={replyTo}
        />
      )}
    </div>
  );
};
