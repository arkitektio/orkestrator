import { useDatalayer } from "@jhnnsrs/datalayer";
import { PageLayout } from "../../layout/PageLayout";
import { useDialog } from "../../layout/dialog/DialogProvider";
import {
  ApplicationAuthorizationGrantType,
  useDetailClientQuery,
} from "../api/graphql";
import { withMan } from "../man";

export type AppProps = {
  id: string;
};

export const Client: React.FC<AppProps> = (props) => {
  const { data } = withMan(useDetailClientQuery)({
    variables: { id: props.id },
  });

  const { s3resolve } = useDatalayer();

  const { ask } = useDialog();
  return (
    <PageLayout actions={<></>}>
      <div className="dark:text-white grid grid-rows-6">
        <div
          className=" font-light row-span-2 p-5 border rounded-lg"
          style={
            data?.client?.release?.logo
              ? {
                  backgroundImage: `url(${s3resolve(
                    data?.client?.release?.logo
                  )}), linear-gradient(rgba(0,0,0,0.3), rgba(1,1,1,0.5))`,
                  backgroundRepeat: "no-repeat",
                  backgroundBlendMode: "multiply",
                  backgroundSize: "cover",
                }
              : {
                  background:
                    "linear-gradient(rgba(0,0,0,0.75), rgba(0,0,0,0.95))",
                }
          }
        >
          <div className="text-6xl">
            {data?.client?.release?.app?.identifier}
          </div>
          <div className="text-2xl mt-1">{data?.client?.release?.version}</div>
          <div className="text-1xl font-light mt-1">
            {data?.client?.oauth2Client.authorizationGrantType ==
              ApplicationAuthorizationGrantType.AuthorizationCode &&
              "Public Client"}
            {data?.client?.oauth2Client.authorizationGrantType ==
              ApplicationAuthorizationGrantType.ClientCredentials &&
              "Confidential Client"}
          </div>
          <div className="text-1xl font-light mt-1">
            <div className="font-bold mb-2">Scopes</div>
            <ul className="">
              {data?.client?.scopes.map((scope) => (
                <li className="font-light text-sm">{scope}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </PageLayout>
  );
};
