import { useParams } from "react-router";
import { ResponsiveGrid } from "../../../components/layout/ResponsiveGrid";
import { notEmpty } from "../../../floating/utils";
import { FlussTemplate } from "../../../fluss/components/FlussTemplate";
import { ActionButton } from "../../../layout/ActionButton";
import { useDialog } from "../../../layout/dialog/DialogProvider";
import { PageLayout } from "../../../layout/PageLayout";
import { Node, Provision } from "../../../linker";
import { withRekuest } from "../../../rekuest";
import {
  useDetailTemplateQuery,
  useProvideMutation,
} from "../../../rekuest/api/graphql";
import { ProvisionCard } from "../../../rekuest/components/cards/ProvisionCard";
import { ProvideDialog } from "../../../rekuest/components/dialogs/ProvideDialog";

export interface DashboardTemplateProps {}

export const DashboardTemplate: React.FC<DashboardTemplateProps> = (props) => {
  const { id } = useParams<{ id: string }>();
  if (!id) return <></>;
  const { data } = withRekuest(useDetailTemplateQuery)({
    variables: { id: id },
  });

  const { ask } = useDialog();

  return (
    <PageLayout
      actions={
        <>
          <ActionButton
            label="Provide"
            onAction={async () => {
              if (data?.template) {
                let x = await ask(ProvideDialog, {
                  template: data.template,
                });
                console.log(x);
              }
            }}
            description="Provide this Template"
          />
        </>
      }
    >
      <div className="flex h-full flex-col">
        <div className="flex-initial text-white">
          <div className="flex flex-row">
            <div className="flex-initial">
              <div className="flex flex-col">
                <div className="font-light text-2xl">
                  {data?.template?.interface}
                </div>
                {data?.template?.node && (
                  <div className="flex-initial text-md text-white mt-auto">
                    implements{" "}
                    <Node.DetailLink
                      object={data?.template?.node.id}
                      className="text-xl"
                    >
                      {data?.template?.node.name}
                    </Node.DetailLink>
                  </div>
                )}
              </div>
            </div>
            <div className="flex-grow"></div>
            <div className="flex-none">
              <div className="flex flex-row gap-2">
                {data?.template?.extensions?.map((i) => (
                  <div className="border-primary-300 p-1 border rounded-md bg-primary-300 text-white">
                    {" "}
                    {i}{" "}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="flex-grow">
          {JSON.stringify(data?.template?.params.flow)}
          {data?.template?.extensions?.includes("flow") &&
            data?.template?.params?.flow && (
              <FlussTemplate flow={data?.template.params.flow} />
            )}
        </div>
        <div className="flex-initial text-white">
          <div className="font-light mt-3 mb-1 text-xl"> Provided on </div>
          <ResponsiveGrid>
            {data?.template?.provisions?.filter(notEmpty).map((prov, index) => (
              <ProvisionCard provision={prov} key={index} />
            ))}
          </ResponsiveGrid>
        </div>
      </div>
    </PageLayout>
  );
};
