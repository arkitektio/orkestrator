import { useParams } from "react-router";
import { notEmpty } from "../../../floating/utils";
import { ActionButton } from "../../../layout/ActionButton";
import { useDialog } from "../../../layout/dialog/DialogProvider";
import { PageLayout } from "../../../layout/PageLayout";
import { Provision } from "../../../linker";
import { withRekuest } from "../../../rekuest";
import {
  useDetailTemplateQuery,
  useProvideMutation,
} from "../../../rekuest/api/graphql";
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
      sidebar={<></>}
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
      <div className="flex-initial h-20 text-white">
        {data?.template?.interface} implements {data?.template?.node.name}
      </div>
      <div className="flex-grow dark:text-white">
        Fullfills extensions: {data?.template?.extensions?.map((ext) => ext)}
        <div className="flex-initial">
          <div className="font-light mt-3 mb-1 text-xl"> Provided by </div>
          {data?.template?.provisions?.filter(notEmpty).map((prov) => (
            <Provision.DetailLink
              object={prov.id}
              className="bg-blue-800 rounded shadow-md text-xl text-white p-1 mr-2 my-auto"
            >
              {prov?.agent?.identifier}
            </Provision.DetailLink>
          ))}
        </div>
      </div>
    </PageLayout>
  );
};
