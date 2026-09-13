import { Card, CardContent } from "@/components/ui/card";
import {
  UserAvatar,
  UserAvatarUsername,
  UserUsername,
} from "@/lok-next/components/UserAvatar";
import { cn } from "@/lib/utils";
import Timestamp from "@/components/ui/timestamp";
import {
  DescendantType,
  LeafType,
  ListCommentType,
  ReplyCommentType,
} from "../types";
import { Mention } from "./Mention";

export const renderLeaf = (x: LeafType) => {
  if (x.italic) {
    return <i>{x.text}</i>;
  }
  if (x.bold) {
    return <b>{x.text}</b>;
  }
  if (x.code) {
    return (
      <code className="bg-back-900 text-xs p-1 rounded-md text-white my-auto">
        {x.text}
      </code>
    );
  }

  return x?.text;
};

export const renderDescendant = (x: DescendantType) => {
  if (!x) return <>Weird</>;

  switch (x.__typename) {
    case "LeafDescendant":
      return renderLeaf(x);
    case "MentionDescendant":
      return <Mention element={x} />;
    case "ParagraphDescendant":
      return <p>{x.children?.map(renderDescendant)}</p>;
    default:
      return <span> Error</span>;
  }
};

/**
 * A reply, one level down. kraph returns replies oldest-first, so the thread
 * reads downward.
 */
const Reply = ({ reply }: { reply: ReplyCommentType }) => (
  <div className="flex gap-2">
    <UserAvatar
      sub={reply.assertion.subject}
      className="h-6 w-6 flex-shrink-0"
    />
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-1">
        <span className="font-semibold text-xs">
          <UserUsername sub={reply.assertion.subject} />
        </span>
        {reply?.createdAt && (
          <Timestamp
            date={reply?.createdAt}
            relative
            className="text-xs text-muted-foreground"
          />
        )}
      </div>
      <Card className={cn("border-border/50", reply.resolved && "opacity-60")}>
        <CardContent className="p-2 text-xs">
          {reply?.descendants?.map(renderDescendant)}
        </CardContent>
      </Card>
    </div>
  </div>
);

/**
 * One remark, as the log has it. There is no user row on a kraph comment — the
 * act of commenting is an `Assertion`, and `subject` is who made it. Resolved
 * remarks are returned alongside live ones and shown dimmed rather than hidden:
 * withdrawing a claim is itself a claim, not a delete.
 */
export const Comment = ({ comment }: { comment: ListCommentType }) => {
  const subject = comment.assertion.subject;

  return (
    <div className="flex gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors group w-full">
      <div className="flex-shrink-0 mt-1">
        <UserAvatarUsername sub={subject} />
      </div>

      <div className="flex flex-col flex-grow min-w-0">
        <Card
          className={cn("mb-2 border-border/50", comment.resolved && "opacity-60")}
        >
          <CardContent className="p-3 text-sm">
            {comment?.descendants?.map(renderDescendant)}
          </CardContent>
        </Card>

        <div className="flex h-7">
          <div className="flex-1 flex items-center gap-2">
            <span className="font-light text-sm hover:underline">
              <UserUsername sub={subject} />
            </span>
            {comment?.createdAt && (
              <Timestamp
                date={comment?.createdAt}
                relative
                className="text-xs text-muted-foreground my-auto ml-2"
              />
            )}
            {comment.resolved && (
              <span className="text-xs text-muted-foreground">Resolved</span>
            )}
          </div>
        </div>

        {comment?.replies && comment.replies.length > 0 && (
          <div className="mt-3 space-y-3 pl-2 border-l-2 border-border/50">
            {comment.replies.map((reply, index) => (
              <Reply reply={reply} key={index} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
