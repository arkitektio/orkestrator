import { useDatalayer } from "@jhnnsrs/datalayer";
import { ResponsiveContainerGrid } from "../../components/layout/ResponsiveContainerGrid";
import { ActionButton } from "../../layout/ActionButton";
import { PageLayout } from "../../layout/PageLayout";
import { SectionTitle } from "../../layout/SectionTitle";
import { LokRelease } from "../../linker";
import { useDialog } from "../../providers/dialog/DialogProvider";
import { withLok } from "../LokContext";
import { useAppQuery } from "../api/graphql";
import { ChangeAppDialog } from "./dialogs/ChangeAppDialog";

export type AppProps = {
  id: string;
};

export const App: React.FC<AppProps> = (props) => {
  const { data } = withLok(useAppQuery)({ variables: { id: props.id } });

  const { s3resolve } = useDatalayer();

  const { ask } = useDialog();
  return (
    <PageLayout
      actions={
        <>
          <ActionButton
            label="Change"
            onAction={async (x) => {
              if (data?.app) {
                await ask(ChangeAppDialog, { app: data?.app });
              }
            }}
          />
        </>
      }
    >
      <div className="h-full dark:text-white">
        <div
          className=" font-light row-span-2 p-5 border rounded-lg"
          style={
            data?.app?.logo
              ? {
                  backgroundImage: `url(${s3resolve(
                    data?.app?.logo
                  )}), linear-gradient(rgba(0,0,0,0.3), rgba(1,1,1,0.5))`,
                  backgroundRepeat: "no-repeat",
                  backgroundBlendMode: "multiply",
                  backgroundSize: "content",
                }
              : {
                  background:
                    "linear-gradient(rgba(0,0,0,0.75), rgba(0,0,0,0.95))",
                }
          }
        >
          <div className="text-6xl">{data?.app?.identifier}</div>
        </div>
        <SectionTitle>Releases</SectionTitle>
        <ResponsiveContainerGrid>
          {data?.app?.releases?.map((release, index) => (
            <LokRelease.Smart
              object={release.id}
              className="border-1 bg-slate-600 rounded-lg p-2"
              key={index}
            >
              <Release.DetailLink object={release.id}>
                {release?.version}
              </Release.DetailLink>
            </LokRelease.Smart>
          ))}
        </ResponsiveContainerGrid>
      </div>
    </PageLayout>
  );
};
