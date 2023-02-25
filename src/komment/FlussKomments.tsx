import { notEmpty } from "../floating/utils";
import { withRekuest } from "../rekuest";
import {
  CommentableModels,
  CommentsForDocument,
  CommentsForQuery,
  useCommentsForQuery,
  useCreateCommentMutation,
  useReplyToMutation,
} from "../fluss/api/graphql";
import { CommentList } from "./display/CommentList";
import { CommentEdit } from "./edit/CommentEdit";
import { KommentProps } from "./types";
import { withFluss } from "../fluss/fluss";

export type MikroKommentsProps = KommentProps<CommentableModels>;

export const FlussKomments = ({ id, model }: MikroKommentsProps) => {
  const { data } = withFluss(useCommentsForQuery)({
    variables: { id, model },
  });

  const [replyTo] = withFluss(useReplyToMutation)({
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

  const [createComment] = withFluss(useCreateCommentMutation)({
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
