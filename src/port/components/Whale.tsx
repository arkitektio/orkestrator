import { PageLayout } from "../../layout/PageLayout";
import { SectionTitle } from "../../layout/SectionTitle";
import { App } from "../../linker";
import { useAppQuery } from "../../lok/api/graphql";
import { withMan } from "../../lok/man";
import { useMikro } from "../../mikro/MikroContext";
import {
  useDetailContainerQuery,
  useStopContainerMutation,
  useRestartContainerMutation,
  useRemoveContainerMutation,
  useDetailWhaleQuery,
} from "../api/graphql";
import { withPort } from "../PortContext";

export type WhaleProps = {
  id: string;
};

export const AppInfo = (props: { clientId: string }) => {
  const { data: appdata } = withMan(useAppQuery)({
    variables: {
      clientId: props.clientId,
    },
    fetchPolicy: "cache-first",
  });

  const { s3resolve } = useMikro();

  return (
    <>
      <div className="">
        {appdata?.app?.id && (
          <App.DetailLink object={appdata?.app?.id}>
            <img
              className="h-8 w-8 rounded-full hover:ring-pink-500 hover:ring-2 cursor-pointer"
              src={
                appdata?.app?.logo
                  ? s3resolve(appdata?.app.logo)
                  : `https://eu.ui-avatars.com/api/?name=${appdata.app.identifier}&background=random`
              }
              alt=""
            />
          </App.DetailLink>
        )}
      </div>
    </>
  );
};

export const Whale = (props: WhaleProps) => {
  const { data } = withPort(useDetailWhaleQuery)({
    variables: { id: props.id },
    pollInterval: 1000,
  });

  const [restart] = withPort(useRestartContainerMutation)();
  const [stop] = withPort(useStopContainerMutation)();
  const [remove] = withPort(useRemoveContainerMutation)();

  return (
    <PageLayout>
      <SectionTitle>Whale {data?.whale?.image}</SectionTitle>
      <div className="text-white">
        <div className="text-2xl">
          Container hosting {data?.whale?.clientId}
        </div>
        {data?.whale?.clientId && <AppInfo clientId={data?.whale?.clientId} />}
      </div>
    </PageLayout>
  );
};
