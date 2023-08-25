import { useCallback, useEffect, useRef, useState } from "react";
import { BiBold, BiCode, BiItalic, BiUnderline } from "react-icons/bi";
import { TiTick } from "react-icons/ti";
import { Editor, Node, Range, Transforms, createEditor } from "slate";
import { Editable, ReactEditor, Slate, useSlate, withReact } from "slate-react";
import { withLok } from "../../LokContext";
import { DescendendKind, useUserOptionsLazyQuery } from "../../api/graphql";
import { CreateCommentFunc, KommentEditor } from "../types";
import {
  KommentElement,
  KommentLeaf,
  Portal,
  insertMention,
  withMentions,
} from "./shared";

export type ICommentEditProps<T> = {
  id: string;
  model: T;
  parent?: string;
};

const initialValue: Node[] = [
  {
    kind: DescendendKind.Paragraph,
    children: [{ text: "", kind: DescendendKind.Leaf }],
  },
];

export type CommentEditProps = {
  identifier: string;
  object: string;
  parent?: string;
  createComment: CreateCommentFunc;
};

const marks = ["bold", "italic", "underline", "code"] as const;
type Mark = (typeof marks)[number];

const toggleMark = (editor: KommentEditor, format: Mark) => {
  const isActive = isMarkActive(editor, format);

  if (isActive) {
    Editor.removeMark(editor, format);
  } else {
    Editor.addMark(editor, format, true);
  }
};

const isMarkActive = (editor: KommentEditor, format: Mark) => {
  const marks = Editor.marks(editor);
  return marks ? marks[format] === true : false;
};

export const MarkButton = ({
  format,
  children,
}: {
  format: Mark;
  children: React.ReactNode;
}) => {
  const editor = useSlate();
  return (
    <button
      className={`${
        isMarkActive(editor, format) ? "opacity-100" : "opacity-20"
      }`}
      onMouseDown={(event) => {
        event.preventDefault();
        toggleMark(editor, format);
      }}
    >
      {children}
    </button>
  );
};

export const CommentEdit = ({
  createComment,
  object,
  parent,
  identifier,
}: CommentEditProps) => {
  const [editor] = useState(() => withMentions(withReact(createEditor())));

  const [searchUser, data] = withLok(useUserOptionsLazyQuery)();

  const ref = useRef<HTMLDivElement>(null);
  const [target, setTarget] = useState<Range | undefined>();
  const [index, setIndex] = useState(0);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  const renderElement = useCallback(
    (props: any) => <KommentElement {...props} />,
    []
  );

  const renderLeaf = useCallback(
    (props: any) => <KommentLeaf {...props} />,
    []
  );

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
    createComment({
      variables: {
        identifier: identifier,
        object: object,
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
      if (event.ctrlKey && event.key === "b") {
        toggleMark(editor, "bold");
      }
      if (event.ctrlKey && event.key === "i") {
        toggleMark(editor, "italic");
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
        <div className="flex flex-col relative">
          <div className="flex flex-row bg-back-50 rounded-t-md p-1 gap-2 border-b-1 border-b border-back-600">
            <MarkButton format="bold">
              <BiBold />
            </MarkButton>
            <MarkButton format="italic">
              <BiItalic />
            </MarkButton>
            <MarkButton format="underline">
              <BiUnderline />
            </MarkButton>
            <MarkButton format="code">
              <BiCode />
            </MarkButton>
          </div>
          <Editable
            className="bg-back-50 w-full border-rounded border-2 border-back-400 border rounded-b md p-2 text-black resize"
            renderElement={renderElement}
            renderLeaf={renderLeaf}
            onKeyDown={onKeyDown}
            placeholder="Leave a comment..."
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

          <b className="absolute bottom-0 right-0 text-black">
            <button
              type="button"
              onClick={() => saveComment()}
              className=" text-black ml-2 rounded-md"
            >
              <TiTick />
            </button>
          </b>
        </div>
      </Slate>
    </>
  );
};
