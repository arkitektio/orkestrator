import { notEmpty } from "../../../utils";
import { ListCommentType, ReplyToFunc } from "../types";
import { Comment } from "./Comment";

export const CommentList: React.FunctionComponent<{
  comments?: ListCommentType[];
  replyTo?: ReplyToFunc;
}> = ({ comments, replyTo }) => {
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
          <div className="flex flex-row justify-center text-center font-light text-md">
            No Comments yet
          </div>
        )}
      </div>
    </>
  );
};
