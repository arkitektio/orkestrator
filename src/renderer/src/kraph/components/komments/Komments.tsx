import { Alert, AlertDescription } from "@/core/components/ui/alert";
import {
  CommentsForDocument,
  CommentsForQuery,
  useCommentOnStructureMutation,
  useCommentsForQuery,
} from "@/kraph/api/graphql";
import { CommentList } from "./display/CommentList";
import { CommentEdit } from "./edit/CommentEdit";
import { KommentProps } from "./types";

/**
 * The discussion an external datum carries. Comments live in kraph now: a
 * remark is a claim about a structure, recorded in the same evidence log as
 * every other claim, so `commentOnStructure` mints the structure if this is the
 * first sight of the object. Nothing has to be ensured beforehand — the call
 * sites keep passing plain `(identifier, object)`.
 *
 * A block, not a pane: the discussion is the bottom half of `KnowledgeSidebar`
 * (the rail's single kraph tab), which owns the height and the scrolling. So
 * this flows at its natural height instead of claiming `h-full` — otherwise it
 * would fight the claims above it for the same column.
 */
export const Komments = ({ identifier, object }: KommentProps) => {
  const { data, error } = useCommentsForQuery({
    variables: { identifier, object: object.id },
  });

  const [commentOnStructure] = useCommentOnStructureMutation({
    update(cache, result) {
      // `commentsFor` is newest-first, so a fresh remark goes on the front.
      // Replies are not spliced here: they land under their parent's `replies`
      // and Apollo normalizes them onto the cached parent by id.
      const created = result.data?.commentOnStructure.comment;
      if (!created || created.parent) return;
      cache.updateQuery<CommentsForQuery>(
        {
          query: CommentsForDocument,
          variables: {
            identifier,
            object: object.id,
          },
        },
        (data) => {
          if (!data) return data;
          return {
            ...data,
            commentsFor: [created, ...data.commentsFor],
          };
        },
      );
    },
  });

  return (
    <div className="flex flex-col gap-2">
      <div>
        <CommentEdit
          identifier={identifier}
          object={object.id}
          commentOnStructure={commentOnStructure}
        />
      </div>
      {error && (
        <div>
          <Alert variant="destructive">
            <AlertDescription>
              Failed to load comments: {error.message}
            </AlertDescription>
          </Alert>
        </div>
      )}
      <div>
        {data?.commentsFor && <CommentList comments={data?.commentsFor} />}
      </div>
    </div>
  );
};
