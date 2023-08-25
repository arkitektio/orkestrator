import { LokUser } from "../../../linker";
import { MentionType } from "../types";

export const Mention = ({ element }: { element: MentionType }) => {
  return (
    <>
      <LokUser.Smart
        object={element?.user?.id}
        className=" px-1 border rounded-full inline "
        dropClassName={() => "inline"}
        containerClassName="inline mr-2"
        mates={[]}
      >
        <LokUser.DetailLink
          object={element?.user.id}
          className="bg-gray-700 p-1 rounded text-white"
        >
          @{element?.user.username}
        </LokUser.DetailLink>
      </LokUser.Smart>
    </>
  );
};
