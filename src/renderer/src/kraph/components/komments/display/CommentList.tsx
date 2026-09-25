import { ScrollArea } from "@/core/components/ui/scroll-area";
import { MessageSquare } from "lucide-react";
import { ListCommentType } from "../types";
import { Comment } from "./Comment";

export const CommentList = ({ comments }: {
  comments?: ListCommentType[];
}) => {
  return (
    <ScrollArea className="flex-1">
      {comments && comments.length > 0 ? (
        <div className="space-y-1">
          {comments.map((comment, index) => (
            <Comment comment={comment} key={index} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <MessageSquare className="h-12 w-12 text-muted-foreground/50 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">No comments yet</p>
          <p className="text-xs text-muted-foreground/70 mt-1">Be the first to share your thoughts</p>
        </div>
      )}
    </ScrollArea>
  );
};
