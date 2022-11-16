import { Link } from "react-router-dom";
import { App, User } from "../../linker";
import { useAppQuery, useUserQuery } from "../api/graphql";
import { withMan } from "../man";

export const AppTag: React.FC<{ version: string; identifier: string }> = ({
  version,
  identifier,
}) => {
  const { data, error } = withMan(useAppQuery)({
    variables: { identifier, version },
  });

  return (
    <div>
      {data?.app?.id ? (
        <App.DetailLink object={data?.app?.id}>
          <div className="my-auto mr-2">
            {data.app.identifier}:{data.app.version}
          </div>
        </App.DetailLink>
      ) : (
        "Unknown"
      )}
    </div>
  );
};
