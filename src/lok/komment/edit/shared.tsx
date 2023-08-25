import ReactDOM from "react-dom";
import { Transforms } from "slate";
import { DescendendKind } from "../../api/graphql";
import {
  DescendendInput,
  ElementRenderProps,
  KommentEditor,
  LeafRenderProps,
} from "../types";
import { MentionEdit } from "./MentionEdit";

export const withMentions = (editor: KommentEditor) => {
  const { isInline, isVoid } = editor;

  editor.isInline = (element) => {
    return element.kind === DescendendKind.Mention ? true : isInline(element);
  };

  editor.isVoid = (element) => {
    return element.kind === DescendendKind.Mention ? true : isVoid(element);
  };

  return editor;
};

export const KommentElement = (props: ElementRenderProps) => {
  const { element, ...restprops } = props;
  switch (element.kind) {
    case DescendendKind.Mention:
      return <MentionEdit element={element} {...restprops} />;
    default:
      return <p {...restprops.attributes}>{props.children}</p>;
  }
};

export const KommentLeaf = ({
  attributes,
  children,
  leaf,
}: LeafRenderProps) => {
  if (leaf.bold) {
    children = <strong>{children}</strong>;
  }

  if (leaf.code) {
    children = (
      <code className="bg-back-900 text-xs p-1 rounded-md text-white">
        {children}
      </code>
    );
  }

  if (leaf.italic) {
    children = <em>{children}</em>;
  }

  if (leaf.underline) {
    children = <u>{children}</u>;
  }

  return <span {...attributes}>{children}</span>;
};

export const insertMention = (
  editor: KommentEditor,
  q: { value: string; label: string } | undefined | null
) => {
  console.log(q);
  if (!q) return;
  const mention: DescendendInput = {
    kind: DescendendKind.Mention,
    user: q.value,
    children: [{ text: q.label, kind: DescendendKind.Leaf }],
  };
  console.log(mention);
  Transforms.insertNodes(editor, mention);
  Transforms.move(editor);
};

export const Portal: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  return typeof document === "object"
    ? ReactDOM.createPortal(children, document.body)
    : null;
};
