import { useDatalayer } from "@jhnnsrs/datalayer";
import { ResponsiveContainerGrid } from "../../components/layout/ResponsiveContainerGrid";
import { PageLayout } from "../../layout/PageLayout";
import { SectionTitle } from "../../layout/SectionTitle";
import { LokClient } from "../../linker";
import { useDialog } from "../../providers/dialog/DialogProvider";
import { withLok } from "../LokContext";
import { useReleaseQuery } from "../api/graphql";

export type AppProps = {
  id: string;
};

export const Release: React.FC<AppProps> = (props) => {
  const { data } = withLok(useReleaseQuery)({ variables: { id: props.id } });

  const { s3resolve } = useDatalayer();

  const { ask } = useDialog();
  return (
    <PageLayout actions={<></>}>
      <div className="dark:text-white h-full">
        <div
          className=" font-light row-span-2 p-5 border rounded-lg"
          style={
            data?.release?.logo
              ? {
                  backgroundImage: `url(${s3resolve(
                    data?.release?.logo
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
          <div className="text-6xl">{data?.release?.app?.identifier}</div>
          <div className="text-2xl mt-1">{data?.release?.version}</div>
        </div>

        <SectionTitle>Clients</SectionTitle>
        <ResponsiveContainerGrid>
          {data?.release?.clients.map((client, index) => (
            <LokClient.Smart
              object={client.id}
              className="border-1 bg-slate-800 rounded-lg p-5"
              key={index}
            >
              <LokClient.DetailLink object={client.id}>
                {client?.id}
              </LokClient.DetailLink>
            </LokClient.Smart>
          ))}
        </ResponsiveContainerGrid>
      </div>
    </PageLayout>
  );
};
