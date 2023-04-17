import { MutationFunction } from "@apollo/client";
import { BaseEditor, BaseElement, BaseText, Node } from "slate";
import { ReactEditor, RenderElementProps, RenderLeafProps } from "slate-react";
import {
  DescendentFragment,
  DetailCommentFragment,
  LeafFragment,
  ListCommentFragment,
  DescendendInput as Desce,
  MentionFragment,
  CreateCommentMutationFn,
  CreateCommentMutation,
  Exact,
  InputMaybe,
  ReplyToMutation,
} from "../rekuest/api/graphql";

export type ListCommentType = ListCommentFragment;
export type DetailCommentType = DetailCommentFragment;
export type LeafType = LeafFragment;
export type DescendantType = DescendentFragment;
export type MentionType = MentionFragment;

export type KommentProps<T> = {
  model: T;
  id: string;
};

export type DescendendInput = Desce;

export type CreateCommentFunc<T> = MutationFunction<
  CreateCommentMutation,
  Exact<{
    id: string;
    model: T;
    descendents: InputMaybe<DescendendInput>[];
    parent?: InputMaybe<string> | undefined;
  }>
>;

export type ReplyToFunc = MutationFunction<
  ReplyToMutation,
  Exact<{
    descendents: InputMaybe<DescendendInput>[];
    parent: string;
  }>
>;

export type ElementProps<T extends DescendendInput> = RenderElementProps & {
  element: T;
  children: LeafFragment;
};

export type KommentEditor = ReactEditor & BaseEditor;

export type KommentNode = KommentEditor | BaseElement | BaseText;

export type ElementRenderProps = ElementProps<DescendendInput>;

export type LeafRenderProps = RenderLeafProps;
