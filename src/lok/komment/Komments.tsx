import { notEmpty } from "../../utils";
import { withLok } from "../LokContext";
import {
  CommentsForDocument,
  CommentsForQuery,
  useCommentsForQuery,
  useCreateCommentMutation,
  useReplyToMutation,
} from "../api/graphql";
import { CommentList } from "./display/CommentList";
import { CommentEdit } from "./edit/CommentEdit";
import { KommentProps } from "./types";

export const Komments = ({ identifier, object }: KommentProps) => {
  const { data } = withLok(useCommentsForQuery)({
    variables: { identifier, object },
  });

  const [replyTo] = withLok(useReplyToMutation)({
    update(cache, result) {
      cache.updateQuery<CommentsForQuery>(
        {
          query: CommentsForDocument,
          variables: {
            identifier,
            object,
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

  const [createComment] = withLok(useCreateCommentMutation)({
    update(cache, result) {
      cache.updateQuery<CommentsForQuery>(
        {
          query: CommentsForDocument,
          variables: {
            identifier,
            object,
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
      <CommentEdit
        identifier={identifier}
        object={object}
        createComment={createComment}
      />
      {data?.commentsfor && (
        <CommentList
          comments={data?.commentsfor.filter(notEmpty)}
          replyTo={replyTo}
        />
      )}
    </div>
  );
};
