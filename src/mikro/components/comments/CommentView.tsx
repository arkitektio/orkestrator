import { Maybe } from "graphql/jsutils/Maybe";
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { User } from "../../../linker";
import { useUserQuery } from "../../../man/api/graphql";
import { withMan } from "../../../man/context";
import {
  DescendentFragment,
  LeafFragment,
  MentionFragment,
} from "../../api/graphql";

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

  return (
    <>
      {data?.user ? (
        <User.Smart
          object={data?.user?.id}
          dropClassName={() => "bg-gray-200 px-1 border rounded-full inline"}
          dragClassName={() => "inline"}
          containerClassName="inline mr-2"
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

export const CommentView = (props: {
  descendents: Maybe<Maybe<DescendentFragment>[]>;
  className?: string;
}) => {
  return (
    <div className={props.className}>
      {props?.descendents?.map(renderDescendend)}
    </div>
  );
};
