import { useState } from "react";
import Timestamp from "react-timestamp";
import { UserIcon } from "../../components/navigation/UserIcon";
import { notEmpty } from "../../floating/utils";
import { UserImage } from "../../rekuest/components/ReserveForm";
import { ReplyTo } from "../edit/ReplyTo";
import {
  DescendantType,
  LeafType,
  ListCommentType,
  ReplyToFunc,
} from "../types";
import { Mention } from "./Mention";

export const renderLeaf = (x: LeafType) => {
  if (x.italic) {
    return <i>{x.text}</i>;
  }
  if (x.bold) {
    return <b>{x.text}</b>;
  }
  if (x.code) {
    return <span className="font-light">{x.text}</span>;
  }

  return x?.text;
};

export const renderDescendend = (x: DescendantType) => {
  if (!x) return <>Weird</>;

  switch (x.typename) {
    case "Leaf":
      return renderLeaf(x);
    case "MentionDescendent":
      return <Mention element={x} />;
    case "ParagraphDescendent":
      return <p>{x.children?.filter(notEmpty).map(renderDescendend)}</p>;
    default:
      return <span> Error</span>;
  }
};

export const Comment = ({
  replyTo,
  comment,
}: {
  comment: ListCommentType;
  replyTo?: ReplyToFunc;
}) => {
  const [showReply, setShowReply] = useState(false);

  return (
    <>
      <div className="flex flex-row rounded rounded-md p-2 group">
        <div className="flex-initial">
          {comment?.user?.sub && <UserImage sub={comment?.user?.sub} />}
        </div>
        <div className="flex-grow flex-col ml-3">
          <div className="text-sm bg-slate-300 p-3 border rounded text-black">
            {comment?.descendents?.filter(notEmpty).map(renderDescendend)}
          </div>
          {comment?.createdAt && (
            <Timestamp
              date={comment?.createdAt}
              relative
              className="mb-1 text-xs"
            />
          )}
          <button
            type="button"
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
                    {s?.user?.sub && <UserImage sub={s?.user?.sub} />}
                  </div>
                  <div className="flex-grow flex-col ml-3">
                    <div className=" text-sm bg-slate-300 p-3 border rounded text-black">
                      {s?.descendents?.filter(notEmpty).map(renderDescendend)}
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
          {showReply && replyTo != undefined && (
            <div className="text-black mt-2 flex flex-row">
              <button type="button" onClick={() => setShowReply(false)}>
                hide{" "}
              </button>
              <div className="flex-grow">
                <ReplyTo parent={comment?.id} replyTo={replyTo} />
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
