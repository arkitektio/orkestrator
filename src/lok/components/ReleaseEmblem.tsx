import { LokRelease } from "../../linker";
import { useReleaseQuery } from "../api/graphql";
import { withLok } from "../LokContext";

export const ReleaseEmblem: React.FC<{
  version: string;
  identifier: string;
}> = ({ version, identifier }) => {
  const { data, error } = withLok(useReleaseQuery)({
    variables: { identifier, version },
  });

  return (
    <div className=" text-sm absolute right-0 bottom-0 translate-x-2 translate-y-2">
      {data?.release?.id && (
        <LokRelease.DetailLink object={data?.release?.id}>
          <img
            className="h-8 w-8 rounded-full hover:ring-pink-500 hover:ring-2 cursor-pointer"
            src={
              data?.release?.logo
                ? data?.release?.logo
                : `https://eu.ui-avatars.com/api/?name=${data?.release?.app?.identifier}&background=random`
            }
            alt=""
          />
        </LokRelease.DetailLink>
      )}
    </div>
  );
};
