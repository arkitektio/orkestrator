import { useDatalayer } from "@jhnnsrs/datalayer";
import { useState } from "react";
import Timestamp from "react-timestamp";
import { LokUser } from "../../../linker";
import { notEmpty } from "../../../utils";
import { CommentEdit } from "../edit/CommentEdit";
import { DescendantType, LeafType, ListCommentType } from "../types";
import { Mention } from "./Mention";

export const renderLeaf = (x: LeafType) => {
  if (x.italic) {
    return <i>{x.text}</i>;
  }
  if (x.bold) {
    return <b>{x.text}</b>;
  }
  if (x.code) {
    return (
      <code className="bg-back-900 text-xs p-1 rounded-md text-white my-auto">
        {x.text}
      </code>
    );
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

export const Comment = ({ comment }: { comment: ListCommentType }) => {
  const [showReply, setShowReply] = useState(false);
  const { s3resolve } = useDatalayer();
  return (
    <>
      <div className="flex flex-row rounded rounded-md p-2 group">
        <div className="flex-initial">
          <LokUser.DetailLink object={comment?.user?.id}>
            <img
              className="h-10 w-10 rounded-full hover:ring-pink-500 hover:ring-2 cursor-pointer"
              src={
                comment?.user?.profile?.avatar
                  ? s3resolve(comment?.user?.profile.avatar)
                  : `https://eu.ui-avatars.com/api/?name=${comment?.user?.username}&background=random`
              }
              alt=""
            />
          </LokUser.DetailLink>
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
                    <img
                      className="h-6 w-6 rounded-full hover:ring-pink-500 hover:ring-2 cursor-pointer"
                      src={
                        comment?.user?.profile?.avatar
                          ? s3resolve(comment?.user?.profile.avatar)
                          : `https://eu.ui-avatars.com/api/?name=${comment?.user?.username}&background=random`
                      }
                      alt=""
                    />
                  </div>
                  <div className="flex-grow flex-col ml-3">
                    <div className=" text-sm bg-slate-300 p-3 border rounded text-black">
                      {s?.descendents?.filter(notEmpty).map(renderDescendend)}
                    </div>
                    <div className="mb-1 text-xs inline hidden group-hover:inline">
                      {s?.user?.username}{" "}
                    </div>{" "}
                    {s?.createdAt && (
                      <Timestamp
                        date={s?.createdAt}
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
              <button type="button" onClick={() => setShowReply(false)}>
                hide{" "}
              </button>
              <div className="flex-grow">
                <CommentEdit parent={comment?.id} />
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
