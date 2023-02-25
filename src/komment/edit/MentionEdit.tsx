import { useFocused, useSelected } from "slate-react";
import { User } from "../../linker";
import { useUserQuery } from "../../lok/api/graphql";
import { withMan } from "../../lok/man";
import { ElementRenderProps } from "../types";

export const MentionEdit = ({
  attributes,
  children,
  element,
}: ElementRenderProps) => {
  if (!element.user) {
    return <>Illl configured</>;
  }
  const selected = useSelected();
  const focused = useFocused();
  console.log(element);

  const { data, error } = withMan(useUserQuery)({
    variables: { id: element.user },
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
            @<b>{data?.user?.username}</b>
            {data?.user?.id}
          </User.DetailLink>
        </User.Smart>
      ) : (
        <span {...attributes} className="cursor-pointer flex flex-row">
          {element.user}{" "}
        </span>
      )}
    </>
  );
};
