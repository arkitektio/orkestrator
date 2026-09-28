import {
  CommentOnStructureMutationFn,
  DescendantFragment,
  DescendantInput,
  LeafFragment,
  ListCommentFragment,
  MentionFragment,
  ReplyCommentFragment,
} from "@/kraph/api/graphql";
import { Identifier, Object } from "@/core/types";

export type ListCommentType = ListCommentFragment;
export type ReplyCommentType = ReplyCommentFragment;
export type LeafType = LeafFragment;
export type DescendantType = DescendantFragment;
export type MentionType = MentionFragment;

export type KommentProps = {
  identifier: Identifier;
  object: Object;
};

export type DescendendInput = DescendantInput;

// One mutation covers a top-level remark and a reply alike — the reply names
// its parent in the input rather than going through a second endpoint.
export type CommentOnStructureFunc = CommentOnStructureMutationFn;
