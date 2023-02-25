import { getDefaultSmartModel, User } from "../../linker";
import { useUserQuery } from "../../lok/api/graphql";
import { withMan } from "../../lok/man";
import { AdditionalMate } from "../../rekuest/postman/mater/mater-context";
import { MentionType } from "../types";

export const Mention = (props: { element: MentionType }) => {
  if (!props.element.user.sub) {
    return <>Illl configured</>;
  }
  const { data, error } = withMan(useUserQuery)({
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
          additionalMates={(type, iself) => {
            return [
              {
                label: "Email",
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
          <User.DetailLink
            object={data?.user.id}
            className="bg-gray-700 p-1 rounded text-white"
          >
            @{data?.user?.username}
            {data.user.id}
          </User.DetailLink>
        </User.Smart>
      ) : (
        "....."
      )}
    </>
  );
};
