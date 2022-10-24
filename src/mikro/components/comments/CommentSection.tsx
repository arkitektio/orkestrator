import { Maybe } from "graphql/jsutils/Maybe";
import React, { useCallback, useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { Link, useNavigate } from "react-router-dom";
import Timestamp from "react-timestamp";
import { createEditor, Descendant, Editor, Range, Transforms } from "slate";
import {
  Editable,
  ReactEditor,
  Slate,
  useFocused,
  useSelected,
  withReact,
} from "slate-react";
import { object } from "yup";
import {
  AdditionalMate,
  Mate,
} from "../../../rekuest/postman/mater/mater-context";
import { getDefaultSmartModel, User } from "../../../linker";
import {
  useUserOptionsLazyQuery,
  useUserQuery,
} from "../../../man/api/graphql";
import { withMan } from "../../../man/context";
import {
  CommentableModels,
  CommentsForDocument,
  CommentsForQuery,
  DescendentFragment,
  LeafFragment,
  ListCommentFragment,
  MentionDescendent,
  MentionFragment,
  useCommentsForQuery,
  useCreateCommentMutation,
} from "../../api/graphql";
import { withMikro } from "../../MikroContext";
import { ElementProps, MyEditor, RenderProps } from "./decs";

interface ICommentEditProps {
  id: string;
  model: CommentableModels;
  parent?: string;
}

const initialValue: Descendant[] = [
  {
    typename: "ParagraphDescendent",
    children: [{ text: "", typename: "Leaf" }],
  },
];

export const Portal: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  return typeof document === "object"
    ? ReactDOM.createPortal(children, document.body)
    : null;
};

const withMentions = (editor: MyEditor) => {
  const { isInline, isVoid } = editor;

  editor.isInline = (element) => {
    return element.typename === "MentionDescendent" ? true : isInline(element);
  };

  editor.isVoid = (element) => {
    return element.typename === "MentionDescendent" ? true : isVoid(element);
  };

  return editor;
};

const insertMention = (
  editor: MyEditor,
  q: { value: string; label: string } | undefined | null
) => {
  console.log(q);
  if (!q) return;
  const mention: MentionFragment & DescendentFragment = {
    typename: "MentionDescendent",
    user: q.value,
    children: [{ text: q.label, typename: "Leaf" }],
  };
  console.log(mention);
  Transforms.insertNodes(editor, mention);
  Transforms.move(editor);
};

const Element = (props: RenderProps) => {
  const { element, ...restprops } = props;
  switch (element.typename) {
    case "MentionDescendent":
      return <Mention element={element} {...restprops} />;
    default:
      return <p {...restprops.attributes}>{props.children}</p>;
  }
};

const Mention = ({
  attributes,
  children,
  element,
}: ElementProps<MentionDescendent & DescendentFragment>) => {
  const selected = useSelected();
  const focused = useFocused();
  const { data, error } = withMan(useUserQuery)({
    variables: { email: element.user },
  });
  return (
    <>
      {data?.user ? (
        <User.Smart
          {...attributes}
          object={data?.user?.id}
          data-cy={`mention-${element.user}`}
          dragStyle={() => ({
            padding: "3px 3px 2px",
            margin: "0 1px",
            verticalAlign: "baseline",
            display: "inline-block",
            borderRadius: "4px",
            backgroundColor: "#eee",
            fontSize: "0.9em",
            boxShadow: selected && focused ? "0 0 0 2px #B4D5FF" : "none",
          })}
          dropClassName={() => "cursor-pointer inline"}
          containerClassName="inline"
        >
          <User.DetailLink
            object={data?.user.id}
            className="cursor-pointer flex flex-row"
          >
            <img
              className="h-4 w-4 rounded-full hover:ring-pink-500 hover:ring-2 cursor-pointer my-auto"
              src={
                data?.user?.avatar
                  ? data?.user.avatar
                  : `https://eu.ui-avatars.com/api/?name=${data?.user?.username}&background=random`
              }
              alt=""
            />
            <b>{data?.user?.username}</b>
          </User.DetailLink>
        </User.Smart>
      ) : (
        <span {...attributes} className="cursor-pointer flex flex-row">
          Loading{" "}
        </span>
      )}
    </>
  );
};

const CommentEdit: React.FunctionComponent<ICommentEditProps> = (props) => {
  const [editor] = useState(() => withMentions(withReact(createEditor())));
  const [searchUser, data] = withMikro(useUserOptionsLazyQuery)();
  const [createComment] = withMikro(useCreateCommentMutation)({
    update(cache, result) {
      cache.updateQuery<CommentsForQuery>(
        {
          query: CommentsForDocument,
          variables: props,
        },
        (data) => {
          if (result.data?.createComment?.parent?.id) {
            return {
              ...data,
              commentsFor:
                result.data?.createComment && data?.commentsfor
                  ? data?.commentsfor.map((t) =>
                      t?.children &&
                      t?.id === result.data?.createComment?.parent?.id
                        ? {
                            ...t,
                            children: [
                              result.data.createComment,
                              ...t?.children,
                            ],
                          }
                        : t
                    )
                  : data?.commentsfor,
            };
          }

          return {
            ...data,
            commentsfor:
              result.data?.createComment && data?.commentsfor
                ? [result.data.createComment, ...data?.commentsfor]
                : data?.commentsfor,
          };
        }
      );
    },
  });

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
    createComment({
      variables: {
        id: props.id,
        model: props.model,
        parent: props.parent,
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

export const renderLeaf = (x: Maybe<LeafFragment>) => {
  if (x?.italic) {
    return <i>{x.text}</i>;
  }
  if (x?.bold) {
    return <b>{x.text}</b>;
  }
  if (x?.code) {
    return <span className="font-light">{x.text}</span>;
  }

  return x?.text;
};

export const MentionDisplay = (props: { element: MentionFragment }) => {
  const { data, error } = withMan(useUserQuery)({
    variables: { email: props.element.user },
  });

  const navigate = useNavigate();

  return (
    <>
      {data?.user ? (
        <User.Smart
          object={data?.user?.id}
          className="bg-gray-200 px-1 border rounded-full inline "
          dropClassName={() => "inline"}
          containerClassName="inline mr-2"
          additionalMates={(type, iself) => {
            return [
              {
                label: "Email Item",
                action: async (partner) => {
                  let x = getDefaultSmartModel(partner.identifier);

                  if (x) {
                    window.open(
                      `mailto:${
                        data?.user?.email
                      }?subject=Look at this&body=Follow this link arkitekt://${x.linkBuilder(
                        partner.object
                      )}"`,
                      "_blank"
                    );
                  }
                },
              },
            ] as AdditionalMate[];
          }}
        >
          <User.DetailLink object={data?.user.id}>
            @{data?.user?.username}
          </User.DetailLink>
        </User.Smart>
      ) : (
        "....."
      )}
    </>
  );
};

export const renderDescendendLower = (x: any) => {
  if (!x) return <>Weird</>;

  switch (x.typename) {
    case "Leaf":
      return renderLeaf(x);
    case "MentionDescendent":
      return <MentionDisplay element={x} />;
    default:
      return <span>{x.children?.map(renderDescendend)}</span>;
  }
};

export const renderDescendend = (x: Maybe<DescendentFragment>) => {
  if (!x) return <>Weird</>;

  switch (x.typename) {
    case "Leaf":
      return renderLeaf(x);
    case "MentionDescendent":
      return <MentionDisplay element={x} />;
    case "ParagraphDescendent":
      return <p>{x.children?.map(renderDescendend)}</p>;
    default:
      return <span> Error</span>;
  }
};

interface IUserAvatarProps {
  email: string;
  className?: string;
}

export const UserAvatar: React.FunctionComponent<IUserAvatarProps> = (
  props
) => {
  const { data, error } = withMan(useUserQuery)({
    variables: { email: props.email },
  });
  return (
    <Link
      to={`/teams/users/${data?.user?.email}`}
      className="cursor-pointer flex flex-col items-center justify-centerm mt-1"
    >
      <img
        className={
          props.className ||
          "h-10 w-10 rounded-md hover:ring-pink-500 hover:ring-2 cursor-pointer my-auto"
        }
        src={
          data?.user?.avatar
            ? data?.user.avatar
            : `https://eu.ui-avatars.com/api/?name=${data?.user?.username}&background=random`
        }
        alt=""
      />
    </Link>
  );
};

export const Comment = (
  props: { comment: Maybe<ListCommentFragment> } & ICommentSectionProps
) => {
  const { comment } = props;
  const [showReply, setShowReply] = useState(false);

  return (
    <>
      <div className="flex flex-row rounded rounded-md p-2 group">
        <div className="flex-initial">
          {comment?.user?.email && <UserAvatar email={comment?.user?.email} />}
        </div>
        <div className="flex-grow flex-col ml-3">
          <div className="text-sm bg-slate-300 p-3 border rounded text-black">
            {comment?.descendents?.map(renderDescendend)}
          </div>
          {comment?.createdAt && (
            <Timestamp
              date={comment?.createdAt}
              relative
              className="mb-1 text-xs"
            />
          )}
          <button
            className="ml-2 text-xs border-gray-400 px-2 border rounded-sm hidden group-hover:inline"
            onClick={() => setShowReply(!showReply)}
          >
            Reply
          </button>
          <div className="pl-1">
            {comment?.children?.map((s) => {
              return (
                <div className="flex flex-row rounded rounded-md p-2 group">
                  <div className="flex-initial">
                    {s?.user?.email && (
                      <UserAvatar
                        email={s?.user?.email}
                        className="h-7 w-7 rounded-md hover:ring-pink-500 hover:ring-2 cursor-pointer my-auto"
                      />
                    )}
                  </div>
                  <div className="flex-grow flex-col ml-3">
                    <div className=" text-sm bg-slate-300 p-3 border rounded text-black">
                      {s?.descendents?.map(renderDescendend)}
                    </div>
                    {comment?.createdAt && (
                      <Timestamp
                        date={comment?.createdAt}
                        relative
                        className="mb-1 text-xs"
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {showReply && (
            <div className="text-black mt-2 flex flex-row">
              <button onClick={() => setShowReply(false)}>hide </button>
              <div className="flex-grow">
                <CommentEdit parent={comment?.id} {...props} />
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export const CommentList: React.FunctionComponent<ICommentSectionProps> = (
  props
) => {
  const { data } = withMikro(useCommentsForQuery)({ variables: props });

  return (
    <>
      <div className="mt-4 text-white flex flex-col gap-3">
        {data?.commentsfor && data?.commentsfor.length > 0 ? (
          <>
            <div className="flex flex-row">Latest Comments</div>
            {data?.commentsfor?.map((comment, index) => (
              <Comment comment={comment} {...props} key={index} />
            ))}
          </>
        ) : (
          <div className="flex flex-row">No Comments yet</div>
        )}
      </div>
    </>
  );
};

interface ICommentSectionProps {
  id: string;
  model: CommentableModels;
  parent?: string;
}

const CommentSection: React.FunctionComponent<ICommentSectionProps> = (
  props
) => {
  return (
    <div className="flex flex-col ">
      <CommentEdit {...props} />
      <CommentList {...props} />
    </div>
  );
};

export default CommentSection;
