import { notEmpty } from "../../floating/utils";
import { ListCommentType, ReplyToFunc } from "../types";
import { Comment } from "./Comment";

export const CommentList: React.FunctionComponent<{
  comments?: ListCommentType[];
  replyTo?: ReplyToFunc;
}> = ({ comments, replyTo }) => {
  console.log(comments);
  return (
    <>
      <div className="mt-4 text-white flex flex-col gap-3">
        {comments && comments.length > 0 ? (
          <>
            <div className="flex flex-row">Latest Comments</div>
            {comments.filter(notEmpty).map((comment, index) => (
              <Comment comment={comment} key={index} replyTo={replyTo} />
            ))}
          </>
        ) : (
          <div className="flex flex-row">No Comments yet</div>
        )}
      </div>
    </>
  );
};
