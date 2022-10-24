import React from "react";
import { AgentStatus, useAgentsQuery } from "../../rekuest/api/graphql";
import {
  ApplicationAuthorizationGrantType,
  useDetailApplicationQuery,
} from "../../man/api/graphql";
import { withMan } from "../man";
import { withRekuest } from "../../rekuest";

export type IAppProps = {
  clientId: string;
};

const isBackendApp = (
  grantType: ApplicationAuthorizationGrantType | undefined
) => {
  return grantType == ApplicationAuthorizationGrantType.ClientCredentials;
};

const Application: React.FC<IAppProps> = ({ clientId }) => {
  const { data } = withMan(useDetailApplicationQuery)({
    variables: { clientId: clientId },
  });

  const { data: prov_data } = withRekuest(useAgentsQuery)({
    variables: { app: clientId },
  });

  return (
    <>
      <div>
        <div>
          <div className="bg-white p-6 border border-gray-200 rounded shadow-md mt-2">
            <p className="font-light text-xl">{data?.application?.name}</p>
            <p className="font-semibold text-md">
              Created by {data?.application?.user?.username}
            </p>

            {!isBackendApp(data?.application?.authorizationGrantType) && (
              <>
                <div className="mt-4 mb-2 font-light text-md">
                  Redirect URIs
                </div>
                {data?.application?.redirectUris?.map((uri) => (
                  <div>{uri}</div>
                ))}
              </>
            )}

            {prov_data?.agents && prov_data.agents.length > 0 && (
              <>
                <div className="mt-4 mb-2 font-light text-md">Providers</div>
                <div className="grid grid-cols-6 gap 2">
                  {prov_data?.agents?.map((agent) => (
                    <div
                      className={`border font-light overflow-hidden text-center rounded border-gray-200 p-3 ${
                        agent?.status == AgentStatus.Active
                          ? " border-green-200 bg-green-100"
                          : "border-gray-200"
                      }`}
                    >
                      {!isBackendApp(data?.application?.authorizationGrantType)
                        ? agent?.registry?.user?.email
                        : "Backend"}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
          <br />
        </div>
      </div>
    </>
  );
};

export { Application };
