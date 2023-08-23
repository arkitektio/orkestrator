import { User } from "../../linker";
import { useUserQuery } from "../../lok/api/graphql";
import { withLok } from "../../lok/LokContext";
import { MentionType } from "../types";

export const Mention = (props: { element: MentionType }) => {
  if (!props.element.user.sub) {
    return <>Illl configured</>;
  }
  const { data, error } = withLok(useUserQuery)({
    variables: { id: props.element.user.sub },
  });

  console.log("x", props.element);

  return (
    <>
      {data?.user ? (
        <User.Smart
          object={data?.user?.id}
          className=" px-1 border rounded-full inline "
          dropClassName={() => "inline"}
          containerClassName="inline mr-2"
          mates={[]}
        >
          <User.DetailLink
            object={data?.user.id}
            className="bg-gray-700 p-1 rounded text-white"
          >
            @{data?.user?.username}
          </User.DetailLink>
        </User.Smart>
      ) : (
        "....."
      )}
    </>
  );
};
