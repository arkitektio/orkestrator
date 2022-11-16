import { DescendendInput, DescendentFragment } from "./../../api/graphql";
import { RenderElementProps } from "slate-react/dist/components/editable";
import { BaseEditor } from "slate";
import { ReactEditor } from "slate-react";
import { LeafFragment } from "../../api/graphql";

export type ElementProps<T extends DescendendInput> = RenderElementProps & {
  element: T;
  children: LeafFragment;
};

type CustomElement = DescendentFragment;

export type RenderProps = ElementProps<DescendendInput>;

export type MyEditor = ReactEditor & BaseEditor;

declare module "slate" {
  interface CustomTypes {
    Editor: MyEditor;
    Element: DescendendInput;
    Text: LeafFragment;
  }
}

declare module "react-timestamp";
