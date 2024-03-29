import React from "react";
import {
  ApplicationAuthorizationGrantType,
  useDetailClientQuery,
} from "../../lok/api/graphql";
import { withRekuest } from "../../rekuest";
import { AgentStatus, useAgentsQuery } from "../../rekuest/api/graphql";
import { withLok } from "../LokContext";

export type IAppProps = {
  clientId: string;
};

const isBackendApp = (
  grantType: ApplicationAuthorizationGrantType | undefined
) => {
  return grantType == ApplicationAuthorizationGrantType.ClientCredentials;
};

const Application: React.FC<IAppProps> = ({ clientId }) => {
  const { data } = withLok(useDetailClientQuery)({
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
            <p className="font-light text-xl">
              Client for {data?.client?.release?.app?.identifier}
            </p>
            <p className="font-semibold text-md">
              Created by {data?.client?.user?.username}
            </p>

            {!isBackendApp(
              data?.client?.oauth2Client?.authorizationGrantType
            ) && (
              <>
                <div className="mt-4 mb-2 font-light text-md">
                  Redirect URIs
                </div>
                {data?.client?.oauth2Client?.redirectUris?.map((uri) => (
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
                      {!isBackendApp(
                        data?.client?.oauth2Client?.authorizationGrantType
                      )
                        ? agent?.registry?.user?.sub
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
