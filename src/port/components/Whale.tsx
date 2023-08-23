import { useDatalayer } from "@jhnnsrs/datalayer";
import { notEmpty } from "../../floating/utils";
import { PageLayout } from "../../layout/PageLayout";
import { SectionTitle } from "../../layout/SectionTitle";
import { App, Container } from "../../linker";
import { withLok } from "../../lok/LokContext";
import { useAppQuery } from "../../lok/api/graphql";
import { withPort } from "../PortContext";
import { useDetailWhaleQuery } from "../api/graphql";

export type WhaleProps = {
  id: string;
};

export const AppInfo = (props: { clientId: string }) => {
  const { data: appdata } = withLok(useAppQuery)({
    variables: {
      clientId: props.clientId,
    },
    fetchPolicy: "cache-first",
  });

  const { s3resolve } = useDatalayer();

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
      <SectionTitle>
        Whale for deployment {data?.whale?.deployment.identifier}
      </SectionTitle>
      <div className="text-white">
        <div className="text-2xl">Container hosting</div>

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
