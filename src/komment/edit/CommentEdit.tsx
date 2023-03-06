import { useCallback, useEffect, useRef, useState } from "react";
import { createEditor, Editor, Node, Range, Transforms } from "slate";
import { Editable, ReactEditor, Slate, withReact } from "slate-react";
import { useUserOptionsLazyQuery } from "../../lok/api/graphql";
import { withMan } from "../../lok/context";
import { CreateCommentFunc } from "../types";
import { insertMention, KommentElement, Portal, withMentions } from "./shared";

export type ICommentEditProps<T> = {
  id: string;
  model: T;
  parent?: string;
};

const initialValue: Node[] = [
  {
    typename: "ParagraphDescendent",
    children: [{ text: "", typename: "Leaf" }],
  },
];

export type CommentEditProps<T extends any> = {
  id: string;
  model: T;
  parent?: string;
  createComment: CreateCommentFunc<T>;
};

export const CommentEdit = <T extends any>({
  createComment,
  id,
  model,
}: CommentEditProps<T>) => {
  const [editor] = useState(() => withMentions(withReact(createEditor())));

  const [searchUser, data] = withMan(useUserOptionsLazyQuery)();

  const ref = useRef<HTMLDivElement>(null);
  const [target, setTarget] = useState<Range | undefined>();
  const [index, setIndex] = useState(0);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const renderElement = useCallback(
    (props: any) => <KommentElement {...props} />,
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
        id: id,
        model: model,
        descendents: editor.children.filter((y) => y.typename !== undefined),
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
