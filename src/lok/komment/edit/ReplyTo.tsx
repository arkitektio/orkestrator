import { useCallback, useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { BaseElement, Editor, Range, Transforms, createEditor } from "slate";
import { Editable, ReactEditor, Slate, withReact } from "slate-react";
import { withLok } from "../../LokContext";
import { DescendendKind, useUserOptionsLazyQuery } from "../../api/graphql";
import {
  DescendendInput,
  ElementRenderProps,
  KommentEditor,
  KommentNode,
  ReplyToFunc,
} from "../types";
import { MentionEdit } from "./MentionEdit";

const Element = (props: ElementRenderProps) => {
  const { element, ...restprops } = props;
  switch (element.kind) {
    case DescendendKind.Mention:
      return <MentionEdit element={element} {...restprops} />;
    default:
      return <p {...restprops.attributes}>{props.children}</p>;
  }
};

const initialValue: KommentNode[] = [
  {
    kind: DescendendKind.Paragraph,
    children: [{ text: "", kind: DescendendKind.Leaf }],
  },
];

const withMentions = (editor: KommentEditor) => {
  const { isInline, isVoid } = editor;

  editor.isInline = (element: BaseElement) => {
    return element.kind === DescendendKind.Mention ? true : isInline(element);
  };

  editor.isVoid = (element: BaseElement) => {
    return element.kind === DescendendKind.Mention ? true : isVoid(element);
  };

  return editor;
};

const insertMention = (
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

export type CommentEditProps = {
  parent: string;
  replyTo: ReplyToFunc;
};

export const ReplyTo = <T extends any>({
  replyTo,
  parent,
}: CommentEditProps) => {
  const [editor] = useState(() => withMentions(withReact(createEditor())));

  const [searchUser, data] = withLok(useUserOptionsLazyQuery)();

  const ref = useRef<HTMLDivElement>(null);
  const [target, setTarget] = useState<Range | undefined>();
  const [index, setIndex] = useState(0);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const renderElement = useCallback((props: any) => <Element {...props} />, []);

  useEffect(() => {
    searchUser({ variables: { search: search.toLowerCase() } });
  }, [search, searchUser]);

  useEffect(() => {
    if (target && data.data?.options && ref.current) {
      const el = ref.current;
      const domRange = ReactEditor.toDOMRange(editor, target);
      const rect = domRange.getBoundingClientRect();
      el.style.top = `${rect.top + window.pageYOffset + 24}px`;
      el.style.left = `${rect.left + window.pageXOffset}px`;
    }
  }, [data, editor, index, search, target]);

  const saveComment = () => {
    console.log(editor.children);
    setSaving(true);
    replyTo({
      variables: {
        parent: parent,
        descendents: editor.children.filter((y) => y.kind !== undefined),
      },
    })
      .catch(console.error)
      .then(() => {
        setSaving(false);
        Transforms.removeNodes(editor);
        Transforms.insertNodes(editor, initialValue);
        Transforms.move(editor);
      });
  };

  const onKeyDown = useCallback(
    (event: any) => {
      console.log("Definining target", target);
      if (event.ctrlKey && event.key === "Enter") {
        saveComment();
      }

      if (target) {
        switch (event.key) {
          case "ArrowDown":
            event.preventDefault();
            setIndex(index + 1);
            break;
          case "ArrowUp":
            event.preventDefault();
            setIndex(index - 1);
            break;
          case "Tab":
          case "Enter":
            event.preventDefault();
            Transforms.select(editor, target);
            insertMention(
              editor,
              data?.data?.options && data.data.options[index]
            );
            setTarget(undefined);
            break;
          case "Escape":
            event.preventDefault();
            setTarget(undefined);
            break;
        }
      }
    },
    [index, search, target, data.data?.options]
  );

  return (
    <>
      <Slate
        editor={editor}
        value={initialValue}
        onChange={() => {
          const { selection } = editor;

          if (selection && Range.isCollapsed(selection)) {
            const [start] = Range.edges(selection);
            const wordBefore = Editor.before(editor, start, { unit: "word" });
            const before = wordBefore && Editor.before(editor, wordBefore);
            const beforeRange = before && Editor.range(editor, before, start);
            const beforeText =
              beforeRange && Editor.string(editor, beforeRange);
            const beforeMatch = beforeText && beforeText.match(/^@(\w*)$/);
            const after = Editor.after(editor, start);
            const afterRange = Editor.range(editor, start, after);
            const afterText = Editor.string(editor, afterRange);
            const afterMatch = afterText.match(/^(\s|$)/);

            if (beforeMatch && afterMatch) {
              setTarget(beforeRange);
              setSearch(beforeMatch[1]);
              setIndex(0);
              return;
            }
          }

          setTarget(undefined);
        }}
      >
        {saving && <div>Saving...</div>}
        <div className="flex flex-row">
          <Editable
            className="bg-slate-50 w-full border-rounded rounded-xl p-3 text-black"
            renderElement={renderElement}
            onKeyDown={onKeyDown}
          />
          {target && (
            <Portal>
              <div
                ref={ref}
                style={{
                  top: "-9999px",
                  left: "-9999px",
                  position: "absolute",
                  zIndex: 1,
                  padding: "3px",
                  background: "white",
                  borderRadius: "4px",
                  boxShadow: "0 1px 5px rgba(0,0,0,.2)",
                }}
                data-cy="mentions-portal"
              >
                {data?.data?.options && data?.data?.options.length > 0 ? (
                  data?.data?.options.map((char, i) => (
                    <div
                      key={i}
                      style={{
                        padding: "1px 3px",
                        borderRadius: "3px",
                        background: i === index ? "#B4D5FF" : "transparent",
                      }}
                    >
                      {char?.label}
                    </div>
                  ))
                ) : (
                  <div>No results. Has this user ever logged in to mikro?</div>
                )}
              </div>
            </Portal>
          )}

          <b className="text-black">
            <button
              type="button"
              onClick={() => saveComment()}
              className="bg-primary-400 p-3 text-white ml-2 rounded-md"
            >
              Save
            </button>
          </b>
        </div>
      </Slate>
    </>
  );
};
