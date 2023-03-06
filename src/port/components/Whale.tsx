import { notEmpty } from "../../floating/utils";
import { PageLayout } from "../../layout/PageLayout";
import { SectionTitle } from "../../layout/SectionTitle";
import { App, Container } from "../../linker";
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

  return (
    <PageLayout>
      <SectionTitle>Whale {data?.whale?.image}</SectionTitle>
      <div className="text-white">
        <div className="text-2xl">
          Container hosting
          {data?.whale?.clientId && (
            <AppInfo clientId={data?.whale?.clientId} />
          )}
        </div>

        {data?.whale?.containers?.filter(notEmpty).map((container) => (
          <Container.Smart
            key={container.id}
            object={container.id}
            className="bg-gray-800 rounded "
          >
            <div className="p-2">
              <Container.DetailLink object={container.id}>
                <div className="text-2xl">
                  {container.image?.tags} {container.status}
                </div>
              </Container.DetailLink>
            </div>
          </Container.Smart>
        ))}
      </div>
    </PageLayout>
  );
};
