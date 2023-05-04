import { Release } from "../../linker";
import { useReleaseQuery } from "../api/graphql";
import { withMan } from "../man";

export const ReleaseEmblem: React.FC<{
  version: string;
  identifier: string;
}> = ({ version, identifier }) => {
  const { data, error } = withMan(useReleaseQuery)({
    variables: { identifier, version },
  });

  return (
    <div className=" text-sm absolute right-0 bottom-0 translate-x-2 translate-y-2">
      {data?.release?.id && (
        <Release.DetailLink object={data?.release?.id}>
          <img
            className="h-8 w-8 rounded-full hover:ring-pink-500 hover:ring-2 cursor-pointer"
            src={
              data?.release?.logo
                ? data?.release?.logo
                : `https://eu.ui-avatars.com/api/?name=${data?.release?.app?.identifier}&background=random`
            }
            alt=""
          />
        </Release.DetailLink>
      )}
    </div>
  );
};
