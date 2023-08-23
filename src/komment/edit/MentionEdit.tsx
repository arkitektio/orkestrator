import { useFocused, useSelected } from "slate-react";
import { withLok } from "../../lok/LokContext";
import { useUserQuery } from "../../lok/api/graphql";
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

  const { data, error } = withLok(useUserQuery)({
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
