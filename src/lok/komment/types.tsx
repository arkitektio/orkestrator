import { BaseEditor, BaseElement, BaseText } from "slate";
import { ReactEditor, RenderElementProps, RenderLeafProps } from "slate-react";
import {
  CreateCommentMutationFn,
  DescendendInput as DSINput,
  DescendentFragment,
  DetailCommentFragment,
  LeafFragment,
  ListCommentFragment,
  MentionFragment,
  ReplyToMutationFn,
} from "../api/graphql";

export type ListCommentType = ListCommentFragment;
export type DetailCommentType = DetailCommentFragment;
export type LeafType = LeafFragment;
export type DescendantType = DescendentFragment;
export type MentionType = MentionFragment;

export type KommentProps = {
  identifier: string;
  object: string;
};

export type DescendendInput = DSINput;

export type CreateCommentFunc = CreateCommentMutationFn;

export type ReplyToFunc = ReplyToMutationFn;

export type ElementProps = RenderElementProps & {
  element: DescendendInput;
  children: DescendendInput[];
};

export type KommentEditor = ReactEditor & BaseEditor;

export type KommentNode = KommentEditor | BaseElement | BaseText;

export type ElementRenderProps = ElementProps;

export type LeafRenderProps = RenderLeafProps;
