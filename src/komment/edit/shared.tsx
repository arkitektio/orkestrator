import { Transforms } from "slate";
import { DescendendInput, ElementRenderProps, KommentEditor } from "../types";
import { MentionEdit } from "./MentionEdit";
import ReactDOM from "react-dom";

export const withMentions = (editor: KommentEditor) => {
  const { isInline, isVoid } = editor;

  editor.isInline = (element) => {
    return element.typename === "MentionDescendent" ? true : isInline(element);
  };

  editor.isVoid = (element) => {
    return element.typename === "MentionDescendent" ? true : isVoid(element);
  };

  return editor;
};

export const KommentElement = (props: ElementRenderProps) => {
  const { element, ...restprops } = props;
  switch (element.typename) {
    case "MentionDescendent":
      return <MentionEdit element={element} {...restprops} />;
    default:
      return <p {...restprops.attributes}>{props.children}</p>;
  }
};

export const insertMention = (
  editor: KommentEditor,
  q: { value: string; label: string } | undefined | null
) => {
  console.log(q);
  if (!q) return;
  const mention: DescendendInput = {
    typename: "MentionDescendent",
    user: q.value,
    children: [{ text: q.label, typename: "Leaf" }],
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
