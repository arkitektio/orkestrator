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
        <span className="font-light inline">@{data?.user?.username}</span>
      ) : (
        <span {...attributes} className="cursor-pointer flex flex-row">
          {element.user}{" "}
        </span>
      )}
    </>
  );
};
