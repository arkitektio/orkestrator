import { LokRelease } from "../../linker";
import { useReleaseQuery } from "../api/graphql";
import { withLok } from "../LokContext";

export const ReleaseTag: React.FC<{ version: string; identifier: string }> = ({
  version,
  identifier,
}) => {
  const { data, error } = withLok(useReleaseQuery)({
    variables: { identifier, version },
  });

  return (
    <div>
      {data?.release?.id ? (
        <LokRelease.DetailLink object={data?.release?.id}>
          <div className="my-auto mr-2">
            {data.release.app?.identifier}:{data.release.version}
          </div>
        </LokRelease.DetailLink>
      ) : (
        "Unknown"
      )}
    </div>
  );
};
